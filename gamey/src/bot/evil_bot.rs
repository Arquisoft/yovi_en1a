use crate::{Coordinates, GameY, YBot, GameStatus, Movement, PlayerId};
use std::time::{Duration, Instant};

const EMPTY: u8 = 0;
const ME: u8 = 1;
const OPP: u8 = 2;
const INF: u32 = 9999;

pub struct EvilBot;

impl EvilBot {
    pub fn new() -> Self { EvilBot }
}

impl Default for EvilBot {
    fn default() -> Self { Self::new() }
}

struct BoardState {
    cells: Vec<u8>,
    adj: Vec<Vec<usize>>,
    touches_a: Vec<bool>,
    touches_b: Vec<bool>,
    touches_c: Vec<bool>,
}

struct Evaluator {
    deque: std::collections::VecDeque<usize>,
}

impl Evaluator {
    fn new(capacity: usize) -> Self {
        Self {
            deque: std::collections::VecDeque::with_capacity(capacity * 2),
        }
    }

    fn dist_to_sides(&mut self, board: &BoardState, player: u8, side: char, out_dist: &mut [u32]) {
        out_dist.fill(INF);
        self.deque.clear();
        
        for i in 0..board.cells.len() {
            let touches = match side {
                'A' => board.touches_a[i],
                'B' => board.touches_b[i],
                'C' => board.touches_c[i],
                _ => false,
            };
            if touches {
                let cell = board.cells[i];
                if cell == player {
                    out_dist[i] = 0;
                    self.deque.push_back(i);
                } else if cell == EMPTY {
                    out_dist[i] = 1;
                    self.deque.push_back(i);
                }
            }
        }
        
        while let Some(u) = self.deque.pop_front() {
            let d = out_dist[u];
            for &v in &board.adj[u] {
                let cell = board.cells[v];
                if cell == (3 - player) { continue; } // opponent
                let weight = if cell == player { 0 } else { 1 };
                if d + weight < out_dist[v] {
                    out_dist[v] = d + weight;
                    if weight == 0 {
                        self.deque.push_front(v);
                    } else {
                        self.deque.push_back(v);
                    }
                }
            }
        }
    }

    fn shortest_win_dist(&mut self, board: &BoardState, player: u8, da: &mut [u32], db: &mut [u32], dc: &mut [u32]) -> u32 {
        self.dist_to_sides(board, player, 'A', da);
        self.dist_to_sides(board, player, 'B', db);
        self.dist_to_sides(board, player, 'C', dc);
        
        let mut min_dist = INF;
        for i in 0..board.cells.len() {
            if board.cells[i] == (3 - player) { continue; }
            let d_a = da[i];
            let d_b = db[i];
            let d_c = dc[i];
            if d_a == INF || d_b == INF || d_c == INF { continue; }
            
            let mut total = d_a + d_b + d_c;
            if board.cells[i] == EMPTY {
                if total >= 2 { total -= 2; }
            }
            if total < min_dist {
                min_dist = total;
            }
        }
        min_dist
    }

    fn evaluate(&mut self, board: &BoardState, da: &mut [u32], db: &mut [u32], dc: &mut [u32]) -> i32 {
        let my_dist = self.shortest_win_dist(board, ME, da, db, dc);
        let opp_dist = self.shortest_win_dist(board, OPP, da, db, dc);
        
        if my_dist == 0 { return 10000; }
        if opp_dist == 0 { return -10000; }
        
        (opp_dist as i32) * 100 - (my_dist as i32) * 100
    }
}

impl EvilBot {
    fn alphabeta(
        evaluator: &mut Evaluator,
        board: &mut BoardState,
        depth: u32,
        mut alpha: i32,
        mut beta: i32,
        maximizing: bool,
        start: Instant,
        max_dur: Duration,
        da: &mut [u32],
        db: &mut [u32],
        dc: &mut [u32]
    ) -> i32 {
        if start.elapsed() >= max_dur {
            return if maximizing { -100000 } else { 100000 };
        }
        
        let eval = evaluator.evaluate(board, da, db, dc);
        if depth == 0 || eval >= 9000 || eval <= -9000 {
            if eval >= 9000 { return eval + depth as i32; }
            if eval <= -9000 { return eval - depth as i32; }
            return eval;
        }
        
        let mut moves = Vec::with_capacity(60);
        for i in 0..board.cells.len() {
            if board.cells[i] == EMPTY {
                moves.push(i);
            }
        }
        
        if maximizing {
            let mut best_val = -100000;
            for m in moves {
                board.cells[m] = ME;
                let score = Self::alphabeta(evaluator, board, depth - 1, alpha, beta, !maximizing, start, max_dur, da, db, dc);
                board.cells[m] = EMPTY;
                
                if start.elapsed() >= max_dur { break; }
                
                best_val = best_val.max(score);
                alpha = alpha.max(score);
                if beta <= alpha { break; }
            }
            best_val
        } else {
            let mut best_val = 100000;
            for m in moves {
                board.cells[m] = OPP;
                let score = Self::alphabeta(evaluator, board, depth - 1, alpha, beta, !maximizing, start, max_dur, da, db, dc);
                board.cells[m] = EMPTY;
                
                if start.elapsed() >= max_dur { break; }
                
                best_val = best_val.min(score);
                beta = beta.min(score);
                if beta <= alpha { break; }
            }
            best_val
        }
    }
}

impl YBot for EvilBot {
    fn name(&self) -> &str { "evil_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let available = board.available_cells();
        if available.is_empty() { return None; }
        if available.len() == 1 {
            return Some(Coordinates::from_index(available[0], board.board_size()));
        }

        let my_id = board.next_player()?;
        
        let total = board.total_cells() as usize;
        let mut bs = BoardState {
            cells: vec![EMPTY; total],
            adj: vec![Vec::new(); total],
            touches_a: vec![false; total],
            touches_b: vec![false; total],
            touches_c: vec![false; total],
        };
        
        let size = board.board_size();
        for i in 0..total {
            let coords = Coordinates::from_index(i as u32, size);
            bs.touches_a[i] = coords.touches_side_a();
            bs.touches_b[i] = coords.touches_side_b();
            bs.touches_c[i] = coords.touches_side_c();
            
            let x = coords.x() as i32;
            let y = coords.y() as i32;
            let nb = [(1,0),(-1,0),(0,1),(0,-1),(1,-1),(-1,1)];
            for (dx, dy) in nb {
                let nx = x + dx;
                let ny = y + dy;
                if nx >= 0 && ny >= 0 && (nx + ny) < size as i32 {
                    let nc = Coordinates::new(nx as u32, ny as u32, (size as i32 - 1 - nx - ny) as u32);
                    bs.adj[i].push(nc.to_index(size) as usize);
                }
            }
        } //
        
        let yen: crate::YEN = board.into();
        let layout: Vec<char> = yen.layout().replace("/", "").chars().collect();
        let my_char = if my_id.id() == 0 { 'B' } else { 'R' };
        let opp_char = if my_id.id() == 0 { 'R' } else { 'B' };
        
        for i in 0..layout.len() {
            if layout[i] == my_char { bs.cells[i] = ME; }
            else if layout[i] == opp_char { bs.cells[i] = OPP; }
        }
        
        let mut evaluator = Evaluator::new(total);
        let mut da = vec![0; total];
        let mut db = vec![0; total];
        let mut dc = vec![0; total];
        
        let start = Instant::now();
        // Give the bot 9.8 seconds
        let max_duration = Duration::from_millis(9800);
        
        let mut root_moves = Vec::new();
        for i in 0..bs.cells.len() {
            if bs.cells[i] == EMPTY {
                bs.cells[i] = ME;
                let score = evaluator.evaluate(&bs, &mut da, &mut db, &mut dc);
                bs.cells[i] = EMPTY;
                root_moves.push((i, score));
            }
        }
        root_moves.sort_by(|a, b| b.1.cmp(&a.1));
        let mut ordered_moves: Vec<usize> = root_moves.into_iter().map(|(m, _)| m).collect();
        
        let mut best_move_idx = ordered_moves[0];
        
        for depth in 1..=30 {
            let mut alpha = -100000;
            let mut beta = 100000;
            let mut current_best = ordered_moves[0];
            let mut move_scores = Vec::new();
            
            for &m in &ordered_moves {
                if start.elapsed() >= max_duration { break; }
                
                bs.cells[m] = ME;
                let score = Self::alphabeta(&mut evaluator, &mut bs, depth - 1, alpha, beta, false, start, max_duration, &mut da, &mut db, &mut dc);
                bs.cells[m] = EMPTY;
                
                move_scores.push((m, score));
                
                if score > alpha {
                    alpha = score;
                    current_best = m;
                }
            }
            
            if start.elapsed() >= max_duration {
                break;
            }
            
            best_move_idx = current_best;
            
            move_scores.sort_by(|a, b| b.1.cmp(&a.1));
            ordered_moves = move_scores.into_iter().map(|(m, _)| m).collect();
            
            if alpha > 9000 {
                break; 
            }
            if alpha < -9000 {
                break; 
            }
        }
        
        Some(Coordinates::from_index(best_move_idx as u32, board.board_size()))
    }
}