use crate::{Coordinates, GameY, YBot, YEN, GameStatus, Movement, PlayerId};

pub struct GamerBot;

impl YBot for GamerBot {
    fn name(&self) -> &str { "gamer_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let size = board.board_size();
        let available = board.available_cells();
        let depth = 4; 
        let bot_player_id = board.next_player().map(|p| p.id()).unwrap_or(0);

        let mut best_score = i32::MIN;
        let mut best_move = None;

        for &idx in available.iter() {
            let coords = Coordinates::from_index(idx, size);
            let mut virtual_board = board.clone();
            
            let movement = Movement::Placement {
                player: PlayerId::new(bot_player_id),
                coords,
            };

            if virtual_board.add_move(movement).is_ok() {
                let score = self.minimax(&virtual_board, depth - 1, false, i32::MIN, i32::MAX, bot_player_id);
                if score > best_score {
                    best_score = score;
                    best_move = Some(coords);
                }
            }
        }
        best_move
    }
}

impl GamerBot {
    fn minimax(&self, board: &GameY, depth: u32, is_maximizing: bool, mut alpha: i32, mut beta: i32, bot_id: u32) -> i32 {
        // If someone won, return a near-infinite score
        // This ensures the bot always picks a winning move over a "good" positional move
        if let GameStatus::Finished { winner } = board.status() {
            // Winning is everything
            return if winner.id() == bot_id { 1000000 } else { -1000000 };
        }

        // DEPTH LIMIT: Stops at depth 0 to keep computation time reasonable
        if depth == 0 {
            return self.evaluate_board(board, bot_id);
        }

        let available = board.available_cells();
        let current_id = board.next_player().map(|p| p.id()).unwrap_or(0);

        if is_maximizing {
            let mut max_eval = i32::MIN;
            for &idx in available.iter() {
                let mut next_board = board.clone();
                let coords = Coordinates::from_index(idx, board.board_size());
                let _ = next_board.add_move(Movement::Placement { player: PlayerId::new(current_id), coords });
                let eval = self.minimax(&next_board, depth - 1, false, alpha, beta, bot_id);
                max_eval = max_eval.max(eval);
                alpha = alpha.max(eval);
                if beta <= alpha { break; }
            }
            max_eval
        } else {
            let mut min_eval = i32::MAX;
            for &idx in available.iter() {
                let mut next_board = board.clone();
                let coords = Coordinates::from_index(idx, board.board_size());
                let _ = next_board.add_move(Movement::Placement { player: PlayerId::new(current_id), coords });
                let eval = self.minimax(&next_board, depth - 1, true, alpha, beta, bot_id);
                min_eval = min_eval.min(eval);
                beta = beta.min(eval);
                if beta <= alpha { break; }
            }
            min_eval
        }
    }

    fn evaluate_board(&self, board: &GameY, bot_id: u32) -> i32 {
        // iterate through the layout as a flat character array
        let size = board.board_size();
        let yen: YEN = board.into();
        let layout: Vec<char> = yen.layout().replace("/", "").chars().collect();
        
        let my_char = if bot_id == 0 { 'R' } else { 'B' };
        let _opp_char = if bot_id == 0 { 'B' } else { 'R' };

        let mut score = 0;

        for (i, &c) in layout.iter().enumerate() {
            if c == '.' { continue; }
            
            let coords = Coordinates::from_index(i as u32, size);
            let mut val = 0;

            // Hex neighbors: (x+1,y), (x-1,y), (x,y+1), (x,y-1), (x+1,y-1), (x-1,y+1)
            let x = coords.x() as i32;
            let y = coords.y() as i32;

            // CLUSTERING HEURISTIC: Check 6 neighbors in the hex grid
            let neighbors = [(1,0), (-1,0), (0,1), (0,-1), (1,-1), (-1,1)];

            for (dx, dy) in neighbors {
                let nx = x + dx;
                let ny = y + dy;
                // Simple bounds check: x+y+z = size-1 in Y coordinates
                if nx >= 0 && ny >= 0 && (nx + ny) < size as i32 {
                    let neighbor_coords = Coordinates::new(nx as u32, ny as u32, (size as i32 - 1 - nx - ny) as u32);
                    let n_idx = neighbor_coords.to_index(size) as usize;
                    if n_idx < layout.len() && layout[n_idx] == c {
                        val += 150; // Bonus for touching same color
                    }
                }
            }

            // WINNING FOCUS: Huge bonus for touching any of the 3 sides
            if coords.touches_side_a() { val += 1000; }
            if coords.touches_side_b() { val += 1000; }
            if coords.touches_side_c() { val += 1000; }

            if c == my_char {
                score += val;
            } else {
                // DEFENSIVE: Bot prioritizes blocking the player over making a nice move.
                score -= (val as f32 * 1.2) as i32; // Value blocking the opponent slightly more
            }
        }
        score
    }
}

// TESTS

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId};

    #[test]
    fn test_gamer_bo_name() {
        let bot = GamerBot;
        assert_eq!(bot.name(), "gamer_bot");
    }

    #[test]
    fn test_gamer_bo_returns_move_on_empty_board() {
        let bot = GamerBot;
        let game = GameY::new(5);

        let chosen_move = bot.choose_move(&game);
        assert!(chosen_move.is_some());
    }

    #[test]
    fn test_gamer_bo_returns_valid_coordinates() {
        let bot = GamerBot;
        let game = GameY::new(5);

        let coords = bot.choose_move(&game).unwrap();
        let index = coords.to_index(game.board_size());

        // Index should be within the valid range for a size-5 board
        // Total cells = (5 * 6) / 2 = 15
        assert!(index < 15);
    }

    #[test]
    fn test_gamer_bo_returns_none_on_full_board() {
        let bot = GamerBot;
        let mut game = GameY::new(2);

        // Fill the board (size 2 has 3 cells)
        let moves = vec![
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(1, 0, 0),
            },
            Movement::Placement {
                player: PlayerId::new(1),
                coords: Coordinates::new(0, 1, 0),
            },
            Movement::Placement {
                player: PlayerId::new(0),
                coords: Coordinates::new(0, 0, 1),
            },
        ];

        for mv in moves {
            game.add_move(mv).unwrap();
        }

        // Board is now full
        assert!(game.available_cells().is_empty());
        let chosen_move = bot.choose_move(&game);
        assert!(chosen_move.is_none());
    }

    #[test]
    fn test_gamer_bo_chooses_from_available_cells() {
        let bot = GamerBot;
        let mut game = GameY::new(3);

        // Make some moves to reduce available cells
        game.add_move(Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 0, 0),
        })
        .unwrap();

        let coords = bot.choose_move(&game).unwrap();
        let index = coords.to_index(game.board_size());

        // The chosen index should be in the available cells
        assert!(game.available_cells().contains(&index));
    }

    #[test]
    fn test_gamer_bo_multiple_calls_return_valid_moves() {
        let bot = GamerBot;
        let game = GameY::new(7);

        // Call choose_move multiple times to exercise the randomness
        for _ in 0..10 {
            let coords = bot.choose_move(&game).unwrap();
            let index = coords.to_index(game.board_size());

            // Total cells for size 7 = (7 * 8) / 2 = 28
            assert!(index < 28);
            assert!(game.available_cells().contains(&index));
        }
    }
}