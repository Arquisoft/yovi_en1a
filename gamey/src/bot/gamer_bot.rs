use crate::{Coordinates, GameY, YBot, YEN, GameStatus, Movement, PlayerId, GameMode};

pub struct GamerBot;

impl YBot for GamerBot {
    fn name(&self) -> &str { "gamer_bot" }

    fn choose_move(&self, board: &GameY) -> Option<Coordinates> {
        let size = board.board_size();
        let available = board.available_cells();
        
        // CORRECCIÓN 1: Depth adaptativo. En el turno 11 (tablero 11x11), 
        // depth 4 es demasiado lento y da TIMEOUT.
        let depth = if available.len() > 50 { 2 } else { 3 }; 
        
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
        if let GameStatus::Finished { winner } = board.status() {
            let mut score = if winner.id() == bot_id { 1000000 } else { -1000000 };
            if board.mode == GameMode::Why_Not { score = -score; }
            return score;
        }

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
        let size = board.board_size();
        
        // Obtenemos el layout limpio (solo celdas) para que los índices coincidan con Coordinates
        let yen: YEN = board.into();
        let clean_layout: Vec<char> = yen.layout().replace("/", "").chars().collect();
        
        let my_char = if bot_id == 0 { 'B' } else { 'R' };
        let mut score = 0;
    
        // Ahora 'i' es el índice de celda real (0, 1, 2...), sin barras
        for (i, &c) in clean_layout.iter().enumerate() {
            if c == '.' { continue; }
            
            // Ahora from_index funcionará perfectamente
            let coords = Coordinates::from_index(i as u32, size);
            let mut val = 0;
    
            let x = coords.x() as i32;
            let y = coords.y() as i32;
            let neighbors = [(1,0), (-1,0), (0,1), (0,-1), (1,-1), (-1,1)];
    
            for (dx, dy) in neighbors {
                let nx = x + dx;
                let ny = y + dy;
                let nz_check = size as i32 - 1 - nx - ny;
    
                if nx >= 0 && ny >= 0 && nz_check >= 0 {
                    let neighbor_coords = Coordinates::new(nx as u32, ny as u32, nz_check as u32);
                    let n_idx = neighbor_coords.to_index(size) as usize;
                    
                    // IMPORTANTE: Para comparar con el vecino, usamos el layout LIMPIO
                    if n_idx < clean_layout.len() && clean_layout[n_idx] == c {
                        val += 150;
                    }
                }
            }
    
            if coords.touches_side_a() { val += 1000; }
            if coords.touches_side_b() { val += 1000; }
            if coords.touches_side_c() { val += 1000; }
    
            if c == my_char {
                score += val;
            } else {
                score -= (val as f32 * 1.2) as i32;
            }
        }
        
        if board.mode == GameMode::Why_Not { score = -score; }
        score
    }
}

// TESTS

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Movement, PlayerId,GameMode};

    #[test]
    fn test_gamer_bot_name() {
        let bot = GamerBot;
        assert_eq!(bot.name(), "gamer_bot");
    }

    #[test]
    fn test_gamer_bot_returns_move_on_empty_board() {
        let bot = GamerBot;
        let game = GameY::new(5);

        let chosen_move = bot.choose_move(&game);
        assert!(chosen_move.is_some());
    }

    #[test]
    fn test_gamer_bot_returns_valid_coordinates() {
        let bot = GamerBot;
        let game = GameY::new(5);

        let coords = bot.choose_move(&game).unwrap();
        let index = coords.to_index(game.board_size());

        // Index should be within the valid range for a size-5 board
        // Total cells = (5 * 6) / 2 = 15
        assert!(index < 15);
    }

    #[test]
    fn test_gamer_bot_returns_none_on_full_board() {
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
    fn test_gamer_bot_chooses_from_available_cells() {
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
    fn test_gamer_bot_multiple_calls_return_valid_moves() {
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
    #[test]
    fn test_gamer_bot_mode_differences() {
        let bot = GamerBot;

        // Setup: Player 0 connecting (0, 0, 2) connects all 3 sides
        let moves = vec![
            Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 2, 0) },
            Movement::Placement { player: PlayerId::new(1), coords: Coordinates::new(2, 0, 0) },
            Movement::Placement { player: PlayerId::new(0), coords: Coordinates::new(0, 1, 1) },
            Movement::Placement { player: PlayerId::new(1), coords: Coordinates::new(1, 1, 0) },
        ];

        // Classic Mode: Bot MUST pick the winning move
        let mut classic_game = GameY::new_with_mode(3, GameMode::Classic);
        for mv in &moves {
            classic_game.add_move(mv.clone()).unwrap();
        }
       let classic_move = bot.choose_move(&classic_game).unwrap();
assert!(
    classic_move == Coordinates::new(0, 0, 2) || classic_move == Coordinates::new(1, 0, 1),
    "Bot should pick a winning move in Classic mode"
);

        // Why Not Mode: Bot MUST AVOID the winning (now losing) move
        let mut why_not_game = GameY::new_with_mode(3, GameMode::Why_Not);
        for mv in &moves {
            why_not_game.add_move(mv.clone()).unwrap();
        }
        let why_not_move = bot.choose_move(&why_not_game).unwrap();
        assert_ne!(why_not_move, Coordinates::new(0, 0, 2), "Bot should avoid the losing move in Why Not mode");
    }
}