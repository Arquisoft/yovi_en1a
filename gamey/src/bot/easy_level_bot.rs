use crate::{Coordinates, GameY, YBot, Movement, PlayerId, YEN};
use rand::prelude::IndexedRandom; // For randomly selecting among equally good moves

pub struct easy_level_bot;

impl YBot for easy_level_bot {
    fn name(&self) -> &str { "easy_level_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let size = board.board_size();
        let available = board.available_cells();
        let bot_player_id = board.next_player().map(|p| p.id()).unwrap_or(0);

        let mut best_score = i32::MIN;
        let mut best_moves = Vec::new(); 

        for &idx in available.iter() {
            let coords = Coordinates::from_index(idx, size);
            let mut virtual_board = board.clone();
            
            let movement = Movement::Placement {
                player: PlayerId::new(bot_player_id),
                coords,
            };

            // Evaluate only one move ahead (greedy approach, no Minimax)
            if virtual_board.add_move(movement).is_ok() {
                let score = self.evaluate_board(&virtual_board, bot_player_id);
                
                if score > best_score {
                    // Found a new best score, reset the list with the new move
                    best_score = score;
                    best_moves.clear();
                    best_moves.push(coords);
                } else if score == best_score {
                    // Tie-breaker: keep track of all moves with the best score
                    best_moves.push(coords);
                }
            }
        }
        
        let mut rng = rand::rng();
        best_moves.choose(&mut rng).copied()
    }
}

impl easy_level_bot {
    fn evaluate_board(&self, board: &GameY, bot_id: u32) -> i32 {
        let size = board.board_size();
        let yen: YEN = board.into();
        let layout: Vec<char> = yen.layout().replace("/", "").chars().collect();
        
        let my_char = if bot_id == 0 { 'R' } else { 'B' };

        let mut score = 0;

        for (i, &c) in layout.iter().enumerate() {
            if c == '.' { continue; }
            
            let coords = Coordinates::from_index(i as u32, size);
            let mut val = 0;

            let x = coords.x() as i32;
            let y = coords.y() as i32;

            // Check 6 hexagonal neighbors for clustering
            let neighbors = [(1,0), (-1,0), (0,1), (0,-1), (1,-1), (-1,1)];

            for (dx, dy) in neighbors {
                let nx = x + dx;
                let ny = y + dy;
                if nx >= 0 && ny >= 0 && (nx + ny) < size as i32 {
                    let neighbor_coords = Coordinates::new(nx as u32, ny as u32, (size as i32 - 1 - nx - ny) as u32);
                    let n_idx = neighbor_coords.to_index(size) as usize;
                    if n_idx < layout.len() && layout[n_idx] == c {
                        val += 150; 
                    }
                }
            }

            // High reward for touching the edges of the board
            if coords.touches_side_a() { val += 1000; }
            if coords.touches_side_b() { val += 1000; }
            if coords.touches_side_c() { val += 1000; }

            if c == my_char {
                score += val;
            } else {
                // Defensive penalty: prioritize blocking the opponent
                score -= (val as f32 * 1.2) as i32; 
            }
        }
        score
    }
}