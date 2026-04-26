use crate::{Coordinates, GameY, YBot, YEN};
use std::time::{Duration, Instant};

const ME: u8 = 1;
const OPP: u8 = 2;
const C_PARAM: f64 = 1.414;

struct RNG {
    state: u64,
}

impl RNG {
    fn new(seed: u64) -> Self { Self { state: seed.max(1) } }
    fn next(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13; x ^= x >> 7; x ^= x << 17;
        self.state = x; x
    }
    fn us(&mut self, max: usize) -> usize { (self.next() % (max as u64)) as usize }
}

struct Node {
    parent: Option<usize>,
    m: usize,
    p: u8,
    visits: u32,
    wins: f64,
    untried: Vec<usize>,
    childs: Vec<usize>,
}

impl Node {
    fn new(par: Option<usize>, m: usize, p: u8, unt: Vec<usize>) -> Self {
        Self { parent: par, m, p, visits: 0, wins: 0.0, untried: unt, childs: Vec::new() }
    }
    fn ucb(&self, pv: u32) -> f64 {
        if self.visits == 0 { return f64::INFINITY; }
        let exploitation = self.wins / (self.visits as f64);
        let exploration = C_PARAM * ((pv as f64).ln() / (self.visits as f64)).sqrt();
        exploitation + exploration
    }
}

struct Topo {
    adj: Vec<Vec<usize>>,
    side_a: Vec<bool>,
    side_b: Vec<bool>,
    side_c: Vec<bool>,
}

impl Topo {
    fn new(size: u32) -> Self {
        let tot = (size * (size + 1)) / 2;
        let mut t = Self { adj: vec![Vec::new(); tot as usize], side_a: vec![false; tot as usize], side_b: vec![false; tot as usize], side_c: vec![false; tot as usize] };
        for i in 0..tot {
            let c = Coordinates::from_index(i, size);
            t.side_a[i as usize] = c.touches_side_a();
            t.side_b[i as usize] = c.touches_side_b();
            t.side_c[i as usize] = c.touches_side_c();
            let (x, y) = (c.x() as i32, c.y() as i32);
            for (dx, dy) in [(1,0),(-1,0),(0,1),(0,-1),(1,-1),(-1,1)] {
                let (nx, ny) = (x + dx, y + dy);
                if nx >= 0 && ny >= 0 && nx + ny < size as i32 {
                    let nc = Coordinates::new(nx as u32, ny as u32, (size as i32 - 1 - nx - ny) as u32);
                    t.adj[i as usize].push(nc.to_index(size) as usize);
                }
            }
        }
        t
    }
}

fn has_path(cells: &[u8], player: u8, topo: &Topo) -> bool {
    let n = cells.len();
    if n == 0 { return false; }
    let mut seen = vec![false; n];
    let mut stack = Vec::with_capacity(n);
    for i in 0..n { if cells[i] == player && topo.side_a[i] { stack.push(i); seen[i] = true; } }
    let (mut rb, mut rc) = (false, false);
    while let Some(cur) = stack.pop() {
        if topo.side_b[cur] { rb = true; } if topo.side_c[cur] { rc = true; }
        if rb && rc { return true; }
        for &nb in &topo.adj[cur] {
            if !seen[nb] && cells[nb] == player { seen[nb] = true; stack.push(nb); }
        }
    }
    false
}

pub struct EvilBot;
impl EvilBot { pub fn new() -> Self { Self } }
impl Default for EvilBot { fn default() -> Self { Self::new() } }

impl YBot for EvilBot {
    fn name(&self) -> &str { "evil_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let size = board.board_size();
        let avail = board.available_cells().clone();
        if avail.is_empty() { return None; }
        if avail.len() == 1 { return Some(Coordinates::from_index(avail[0], size)); }

        let my_id = board.next_player()?.id();
        let tot: usize = ((size * (size + 1)) / 2) as usize;
        let topo = Topo::new(size);

        let yen: YEN = board.into();
        let lay: Vec<char> = yen.layout().replace("/", "").chars().collect();
        let my_c = if my_id == 0 { 'B' } else { 'R' };
        let op_c = if my_id == 0 { 'R' } else { 'B' };

        let mut cells = vec![0u8; tot];
        let empties: Vec<usize> = (0..tot).filter(|&i| lay[i] == '.').collect();
        for i in 0..lay.len() {
            if lay[i] == my_c { cells[i] = ME; }
            else if lay[i] == op_c { cells[i] = OPP; }
        }

        let mut rng = RNG::new(0xCAFEBABE);
        let start = Instant::now();
        let tl = Duration::from_millis(4800);
        
        let mut nodes: Vec<Node> = Vec::with_capacity(250_000);
        nodes.push(Node::new(None, usize::MAX, 0, empties.clone()));

        while start.elapsed() < tl {
            // SELECTION: traverse tree via UCB while fully expanded
            let mut cur = 0;
            let mut pl = ME;
            
            // KORREKT: UCB only when fully expanded (no untried moves left)
            while nodes[cur].untried.is_empty() && !nodes[cur].childs.is_empty() {
                let pv = nodes[cur].visits;
                let (mut best_ch, mut best_ucb) = (0, f64::NEG_INFINITY);
                for &ch in &nodes[cur].childs {
                    let u = nodes[ch].ucb(pv);
                    if u > best_ucb { best_ucb = u; best_ch = ch; }
                }
                cur = best_ch;
                pl = 3 - pl;
            }

            // EXPANSION: add new node if we have untried moves
            if !nodes[cur].untried.is_empty() {
                let untried_len = nodes[cur].untried.len();
                let m = nodes[cur].untried.swap_remove(rng.us(untried_len));
                
                // Build new untried list (all remaining cells except this move)
                let mut new_untried: Vec<usize> = vec![];
                for &e in &empties {
                    if e != m { new_untried.push(e); }
                }
                
                let new_node = Node::new(Some(cur), m, pl, new_untried);
                let new_idx = nodes.len();
                nodes.push(new_node);
                nodes[cur].childs.push(new_idx);
                cur = new_idx;
                pl = 3 - pl;
            } else {
                // Can't expand - either no children or leaf, use this node for simulation
                if nodes[cur].childs.is_empty() && nodes[cur].untried.is_empty() {
                    break;
                }
            }

            // SIMULATION: apply the path from root to current node BEFORE simulation
            let mut sim_cells = cells.clone();
            
            // Reconstruct path and apply moves
            let mut path: Vec<(usize, u8)> = vec![];
            let mut node = cur;
            while let Some(parent_idx) = nodes[node].parent {
                path.push((nodes[node].m, nodes[node].p));
                node = parent_idx;
            }
            path.reverse();
            
            for (cell_idx, player) in &path {
                sim_cells[*cell_idx] = *player;
                pl = 3 - *player;
            }

            // Playout: fill remaining empty cells randomly
            let mut remaining: Vec<usize> = vec![];
            for i in 0..tot {
                if sim_cells[i] == 0 { remaining.push(i); }
            }
            
            // Shuffle
            for i in (1..remaining.len()).rev() {
                let j = rng.us(i + 1);
                remaining.swap(i, j);
            }
            
            for &c in &remaining {
                sim_cells[c] = pl;
                pl = 3 - pl;
            }
            
            let winner = if has_path(&sim_cells, ME, &topo) { ME } else { OPP };

            // BACKPROP: update all nodes in path
            let mut bp = Some(cur);
            while let Some(idx) = bp {
                nodes[idx].visits += 1;
                if nodes[idx].p == winner { nodes[idx].wins += 1.0; }
                bp = nodes[idx].parent;
            }
        }

        // SELECT BEST CHILD with most visits
        let root = &nodes[0];
        let mut best_move: Option<usize> = None;
        let mut most_vis = 0u32;
        for &ch in &root.childs {
            if nodes[ch].visits > most_vis { most_vis = nodes[ch].visits; best_move = Some(nodes[ch].m); }
        }
        if best_move.is_none() { best_move = empties.first().copied(); }
        best_move.map(|m| Coordinates::from_index(m as u32, size))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId};
    #[test] fn n() { assert_eq!(EvilBot.name(&EvilBot), "evil_bot"); }
    #[test] fn m() { let g = GameY::new(4); assert!(EvilBot.choose_move(&g).is_some()); }
    #[test] fn v() {
        let mut g = GameY::new(3);
        g.add_move(Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(2,0,0) }).unwrap();
        let c = EvilBot.choose_move(&g).unwrap();
        let idx = c.to_index(3);
        assert!(g.available_cells().contains(&idx));
    }
}