use gamey::{
    Coordinates, GameAction, GameStatus, GameY, GameYError, Movement, PlayerId, RenderOptions, YEN,
};
use std::fs;
use tempfile::tempdir;

// ============================================================================
// Game Initialization Tests
// ============================================================================

#[test]
fn test_new_game_has_correct_board_size() {
    let game = GameY::new(5);
    assert_eq!(game.board_size(), 5);
}

#[test]
fn test_new_game_starts_with_player_0() {
    let game = GameY::new(5);
    assert_eq!(game.next_player(), Some(PlayerId::new(0)));
}

#[test]
fn test_new_game_is_not_over() {
    let game = GameY::new(5);
    assert!(!game.check_game_over());
}

#[test]
fn test_new_game_has_correct_total_cells() {
    // Total cells for triangular board: n*(n+1)/2
    let game3 = GameY::new(3);
    assert_eq!(game3.total_cells(), 6); // 1+2+3 = 6

    let game5 = GameY::new(5);
    assert_eq!(game5.total_cells(), 15); // 1+2+3+4+5 = 15

    let game7 = GameY::new(7);
    assert_eq!(game7.total_cells(), 28); // 1+2+3+4+5+6+7 = 28
}

#[test]
fn test_new_game_all_cells_available() {
    let game = GameY::new(5);
    assert_eq!(game.available_cells().len(), 15);
}

#[test]
fn test_single_cell_board_initialization() {
    let game = GameY::new(1);
    assert_eq!(game.board_size(), 1);
    assert_eq!(game.total_cells(), 1);
    assert_eq!(game.available_cells().len(), 1);
}

// ============================================================================
// Game Flow Tests - Basic Moves
// ============================================================================

#[test]
fn test_single_move_changes_next_player() {
    let mut game = GameY::new(5);

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(4, 0, 0), // Top corner
    })
    .unwrap();

    assert_eq!(game.next_player(), Some(PlayerId::new(1)));
}

#[test]
fn test_two_moves_alternate_players() {
    let mut game = GameY::new(5);

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(4, 0, 0),
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(3, 1, 0),
    })
    .unwrap();

    assert_eq!(game.next_player(), Some(PlayerId::new(0)));
}

#[test]
fn test_move_decreases_available_cells() {
    let mut game = GameY::new(3);
    let initial_count = game.available_cells().len();

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 0, 0),
    })
    .unwrap();

    assert_eq!(game.available_cells().len(), initial_count - 1);
}

#[test]
fn test_multiple_moves_track_available_cells() {
    let mut game = GameY::new(3); // 6 cells total

    // Make 3 moves
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 0, 0),
    })
    .unwrap();
    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(1, 1, 0),
    })
    .unwrap();
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 2, 0),
    })
    .unwrap();

    assert_eq!(game.available_cells().len(), 3);
}

// ============================================================================
// Win Condition Tests
// ============================================================================

#[test]
fn test_player_0_wins_by_connecting_three_sides() {
    let mut game = GameY::new(3);

    // Player 0 wins by placing on bottom row (connects all 3 sides)
    let moves = vec![
        Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 0, 2), // Side A and B
        },
        Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(2, 0, 0), // Top corner
        },
        Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 1, 1), // Side A
        },
        Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(1, 1, 0),
        },
        Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(0, 2, 0), // Side A and C - connects all sides
        },
    ];

    for mv in moves {
        game.add_move(mv).unwrap();
    }

    assert!(game.check_game_over());
    match game.status() {
        GameStatus::Finished { winner } => {
            assert_eq!(*winner, PlayerId::new(0));
        }
        _ => panic!("Game should be finished"),
    }
}

#[test]
fn test_player_1_wins() {
    let mut game = GameY::new(3);

    // Player 0 makes filler moves while player 1 wins
    let moves = vec![
        Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(2, 0, 0), // Top
        },
        Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(0, 0, 2), // Bottom left
        },
        Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 1, 0),
        },
        Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(0, 1, 1), // Middle bottom
        },
        Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 0, 1),
        },
        Movement::Placement {
            player: PlayerId::new(1),
            coords: Coordinates::new(0, 2, 0), // Bottom right - wins!
        },
    ];

    for mv in moves {
        game.add_move(mv).unwrap();
    }

    assert!(game.check_game_over());
    match game.status() {
        GameStatus::Finished { winner } => {
            assert_eq!(*winner, PlayerId::new(1));
        }
        _ => panic!("Game should be finished with player 1 as winner"),
    }
}

#[test]
fn test_single_cell_board_instant_win() {
    let mut game = GameY::new(1);

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 0, 0), // Only cell, touches all sides
    })
    .unwrap();

    assert!(game.check_game_over());
    match game.status() {
        GameStatus::Finished { winner } => {
            assert_eq!(*winner, PlayerId::new(0));
        }
        _ => panic!("Game should be finished"),
    }
}

#[test]
fn test_size_2_board_win() {
    let mut game = GameY::new(2);

    // Board layout:
    //     (1,0,0)
    //   (0,0,1) (0,1,0)
    // Player 0 wins with two adjacent pieces on bottom row
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 0, 1), // Side A and B
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(1, 0, 0), // Top
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 1, 0), // Side A and C - connects to form winning path
    })
    .unwrap();

    assert!(game.check_game_over());
    match game.status() {
        GameStatus::Finished { winner } => {
            assert_eq!(*winner, PlayerId::new(0));
        }
        _ => panic!("Game should be finished"),
    }
}

#[test]
fn test_game_not_over_without_three_sides() {
    let mut game = GameY::new(5);

    // Place pieces that touch only 2 sides
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 0, 4), // Side A and B
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(4, 0, 0), // Side B and C
    })
    .unwrap();

    assert!(!game.check_game_over());
}

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_cannot_place_on_occupied_cell() {
    let mut game = GameY::new(5);

    let coords = Coordinates::new(2, 1, 1);

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords,
    })
    .unwrap();

    let result = game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords, // Same coordinates
    });

    assert!(result.is_err());
    match result.unwrap_err() {
        GameYError::Occupied {
            coordinates,
            player: _,
        } => {
            assert_eq!(coordinates, coords);
        }
        other => panic!("Expected Occupied error, got {:?}", other),
    }
}

#[test]
fn test_check_player_turn_wrong_player() {
    let game = GameY::new(5);

    let movement = Movement::Placement {
        player: PlayerId::new(1), // Should be 0's turn
        coords: Coordinates::new(2, 1, 1),
    };

    let result = game.check_player_turn(&movement);

    assert!(result.is_err());
    match result.unwrap_err() {
        GameYError::InvalidPlayerTurn { expected, found } => {
            assert_eq!(expected, PlayerId::new(0));
            assert_eq!(found, PlayerId::new(1));
        }
        other => panic!("Expected InvalidPlayerTurn error, got {:?}", other),
    }
}

#[test]
fn test_check_player_turn_correct_player() {
    let game = GameY::new(5);

    let movement = Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 1, 1),
    };

    assert!(game.check_player_turn(&movement).is_ok());
}

// ============================================================================
// Game Actions Tests (Resign, Swap)
// ============================================================================

#[test]
fn test_resign_ends_game_with_opponent_winning() {
    let mut game = GameY::new(5);

    game.add_move(Movement::Action {
        player: PlayerId::new(0),
        action: GameAction::Resign,
    })
    .unwrap();

    assert!(game.check_game_over());
    match game.status() {
        GameStatus::Finished { winner } => {
            assert_eq!(*winner, PlayerId::new(1));
        }
        _ => panic!("Game should be finished"),
    }
}

#[test]
fn test_player_1_resign_makes_player_0_win() {
    let mut game = GameY::new(5);

    // Player 0 makes a move
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(4, 0, 0),
    })
    .unwrap();

    // Player 1 resigns
    game.add_move(Movement::Action {
        player: PlayerId::new(1),
        action: GameAction::Resign,
    })
    .unwrap();

    assert!(game.check_game_over());
    match game.status() {
        GameStatus::Finished { winner } => {
            assert_eq!(*winner, PlayerId::new(0));
        }
        _ => panic!("Game should be finished with player 0 as winner"),
    }
}

#[test]
fn test_swap_changes_next_player() {
    let mut game = GameY::new(5);

    game.add_move(Movement::Action {
        player: PlayerId::new(0),
        action: GameAction::Swap,
    })
    .unwrap();

    assert!(!game.check_game_over());
    assert_eq!(game.next_player(), Some(PlayerId::new(1)));
}

#[test]
fn test_swap_after_opening_move() {
    let mut game = GameY::new(5);

    // Player 0 makes opening move
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 1, 1),
    })
    .unwrap();

    // Player 1 uses swap action
    game.add_move(Movement::Action {
        player: PlayerId::new(1),
        action: GameAction::Swap,
    })
    .unwrap();

    // Now it's player 0's turn again
    assert_eq!(game.next_player(), Some(PlayerId::new(0)));
    assert!(!game.check_game_over());
}

// ============================================================================
// YEN Serialization Tests
// ============================================================================

#[test]
fn test_yen_round_trip_empty_board() {
    let game = GameY::new(3);
    let yen: YEN = (&game).into();
    let loaded_game = GameY::try_from(yen.clone()).unwrap();

    assert_eq!(game.board_size(), loaded_game.board_size());
    assert_eq!(
        game.available_cells().len(),
        loaded_game.available_cells().len()
    );
}

#[test]
fn test_yen_round_trip_with_moves() {
    let mut game = GameY::new(4);

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(3, 0, 0),
    })
    .unwrap();
    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(2, 1, 0),
    })
    .unwrap();
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(1, 1, 1),
    })
    .unwrap();

    let yen: YEN = (&game).into();
    let loaded_game = GameY::try_from(yen.clone()).unwrap();

    let yen_reloaded: YEN = (&loaded_game).into();
    assert_eq!(yen.layout(), yen_reloaded.layout());
}

#[test]
fn test_yen_preserves_board_state() {
    let yen_str = r#"{
        "size": 3,
        "turn": 0,
        "players": ["B","R"],
        "layout": "B/RB/.R."
    }"#;

    let yen: YEN = serde_json::from_str(yen_str).unwrap();
    let game = GameY::try_from(yen.clone()).unwrap();

    assert_eq!(game.board_size(), 3);
    // 4 pieces placed, 2 remaining
    assert_eq!(game.available_cells().len(), 2);
}

#[test]
fn test_yen_invalid_layout_wrong_rows() {
    let yen_str = r#"{
        "size": 3,
        "turn": 0,
        "players": ["B","R"],
        "layout": "B/RB"
    }"#;

    let yen: YEN = serde_json::from_str(yen_str).unwrap();
    let result = GameY::try_from(yen);

    assert!(result.is_err());
    match result.unwrap_err() {
        GameYError::InvalidYENLayout { expected, found } => {
            assert_eq!(expected, 3);
            assert_eq!(found, 2);
        }
        other => panic!("Expected InvalidYENLayout error, got {:?}", other),
    }
}

#[test]
fn test_yen_invalid_layout_wrong_cells_in_row() {
    let yen_str = r#"{
        "size": 3,
        "turn": 0,
        "players": ["B","R"],
        "layout": "B/RBB/..."
    }"#;

    let yen: YEN = serde_json::from_str(yen_str).unwrap();
    let result = GameY::try_from(yen);

    assert!(result.is_err());
    match result.unwrap_err() {
        GameYError::InvalidYENLayoutLine {
            expected,
            found,
            line,
        } => {
            assert_eq!(expected, 2);
            assert_eq!(found, 3);
            assert_eq!(line, 1);
        }
        other => panic!("Expected InvalidYENLayoutLine error, got {:?}", other),
    }
}

#[test]
fn test_yen_invalid_character() {
    let yen_str = r#"{
        "size": 3,
        "turn": 0,
        "players": ["B","R"],
        "layout": "X/RB/..."
    }"#;

    let yen: YEN = serde_json::from_str(yen_str).unwrap();
    let result = GameY::try_from(yen);

    assert!(result.is_err());
    match result.unwrap_err() {
        GameYError::InvalidCharInLayout { char, row, col } => {
            assert_eq!(char, 'X');
            assert_eq!(row, 0);
            assert_eq!(col, 0);
        }
        other => panic!("Expected InvalidCharInLayout error, got {:?}", other),
    }
}

// ============================================================================
// File Save/Load Tests
// ============================================================================

#[test]
fn test_save_and_load_game_file() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test_game.yen");

    let mut game = GameY::new(4);
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(3, 0, 0),
    })
    .unwrap();
    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(2, 0, 1),
    })
    .unwrap();

    game.save_to_file(&file_path).unwrap();

    let loaded_game = GameY::load_from_file(&file_path).unwrap();

    assert_eq!(game.board_size(), loaded_game.board_size());
    assert_eq!(
        game.available_cells().len(),
        loaded_game.available_cells().len()
    );

    // Verify layouts match
    let yen_original: YEN = (&game).into();
    let yen_loaded: YEN = (&loaded_game).into();
    assert_eq!(yen_original.layout(), yen_loaded.layout());
}

#[test]
fn test_load_nonexistent_file() {
    let result = GameY::load_from_file("/nonexistent/path/game.yen");

    assert!(result.is_err());
    match result.unwrap_err() {
        GameYError::IoError { message, error: _ } => {
            assert!(message.contains("Failed to read file"));
        }
        other => panic!("Expected IoError, got {:?}", other),
    }
}

#[test]
fn test_load_invalid_json_file() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("invalid.yen");
    fs::write(&file_path, "{ invalid json }").unwrap();

    let result = GameY::load_from_file(&file_path);

    assert!(result.is_err());
    match result.unwrap_err() {
        GameYError::SerdeError { error: _ } => {}
        other => panic!("Expected SerdeError, got {:?}", other),
    }
}

// ============================================================================
// Coordinate System Tests
// ============================================================================

#[test]
fn test_coordinate_index_round_trip() {
    for board_size in 1..=7 {
        let total_cells = (board_size * (board_size + 1)) / 2;
        for idx in 0..total_cells {
            let coords = Coordinates::from_index(idx, board_size);
            let back_to_idx = coords.to_index(board_size);
            assert_eq!(
                idx, back_to_idx,
                "Round trip failed for idx {} with board_size {}",
                idx, board_size
            );
        }
    }
}

#[test]
fn test_coordinates_from_vec() {
    let coords = Coordinates::from_vec(&[1, 2, 3]).unwrap();
    assert_eq!(coords.x(), 1);
    assert_eq!(coords.y(), 2);
    assert_eq!(coords.z(), 3);
}

#[test]
fn test_coordinates_from_vec_wrong_length() {
    assert!(Coordinates::from_vec(&[1, 2]).is_none());
    assert!(Coordinates::from_vec(&[1, 2, 3, 4]).is_none());
    assert!(Coordinates::from_vec(&[]).is_none());
}

#[test]
fn test_coordinates_to_vec() {
    let coords = Coordinates::new(1, 2, 3);
    let vec: Vec<u32> = coords.into();
    assert_eq!(vec, vec![1, 2, 3]);
}

#[test]
fn test_coordinates_touch_sides() {
    // Side A: x == 0
    let side_a = Coordinates::new(0, 2, 1);
    assert!(side_a.touches_side_a());
    assert!(!side_a.touches_side_b());
    assert!(!side_a.touches_side_c());

    // Side B: y == 0
    let side_b = Coordinates::new(2, 0, 1);
    assert!(!side_b.touches_side_a());
    assert!(side_b.touches_side_b());
    assert!(!side_b.touches_side_c());

    // Side C: z == 0
    let side_c = Coordinates::new(1, 2, 0);
    assert!(!side_c.touches_side_a());
    assert!(!side_c.touches_side_b());
    assert!(side_c.touches_side_c());
}

#[test]
fn test_corner_touches_two_sides() {
    // Bottom left corner touches A and B
    let bottom_left = Coordinates::new(0, 0, 4);
    assert!(bottom_left.touches_side_a());
    assert!(bottom_left.touches_side_b());
    assert!(!bottom_left.touches_side_c());

    // Bottom right corner touches A and C
    let bottom_right = Coordinates::new(0, 4, 0);
    assert!(bottom_right.touches_side_a());
    assert!(!bottom_right.touches_side_b());
    assert!(bottom_right.touches_side_c());

    // Top corner touches B and C
    let top = Coordinates::new(4, 0, 0);
    assert!(!top.touches_side_a());
    assert!(top.touches_side_b());
    assert!(top.touches_side_c());
}

// ============================================================================
// Rendering Tests
// ============================================================================

#[test]
fn test_render_empty_board() {
    let game = GameY::new(3);
    let options = RenderOptions {
        show_3d_coords: false,
        show_idx: false,
        show_colors: false,
    };
    let rendered = game.render(&options);

    assert!(rendered.contains("Game of Y (Size 3)"));
    assert!(rendered.contains(".")); // Empty cells
}

#[test]
fn test_render_with_pieces() {
    let mut game = GameY::new(3);
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 0, 0),
    })
    .unwrap();
    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(1, 1, 0),
    })
    .unwrap();

    let options = RenderOptions {
        show_3d_coords: false,
        show_idx: false,
        show_colors: false,
    };
    let rendered = game.render(&options);

    assert!(rendered.contains("0")); // Player 0's piece
    assert!(rendered.contains("1")); // Player 1's piece
}

#[test]
fn test_render_with_3d_coords() {
    let game = GameY::new(2);
    let options = RenderOptions {
        show_3d_coords: true,
        show_idx: false,
        show_colors: false,
    };
    let rendered = game.render(&options);

    // Should contain coordinate notation
    assert!(rendered.contains("("));
    assert!(rendered.contains(")"));
}

#[test]
fn test_render_with_indices() {
    let game = GameY::new(2);
    let options = RenderOptions {
        show_3d_coords: false,
        show_idx: true,
        show_colors: false,
    };
    let rendered = game.render(&options);

    // Should contain index notation
    assert!(rendered.contains("(0)") || rendered.contains("(1)") || rendered.contains("(2)"));
}

// ============================================================================
// Complex Game Scenarios
// ============================================================================

#[test]
fn test_full_game_on_size_4_board() {
    let mut game = GameY::new(4);

    // Play a sequence of moves
    let moves = vec![
        (0, Coordinates::new(3, 0, 0)), // Top
        (1, Coordinates::new(2, 1, 0)),
        (0, Coordinates::new(2, 0, 1)),
        (1, Coordinates::new(1, 2, 0)),
        (0, Coordinates::new(1, 0, 2)),
        (1, Coordinates::new(0, 3, 0)),
        (0, Coordinates::new(0, 0, 3)), // Player 0 now touches side A and B
        (1, Coordinates::new(0, 2, 1)),
        (0, Coordinates::new(1, 1, 1)), // Interior cell - connects pieces
    ];

    for (player_id, coords) in &moves {
        game.add_move(Movement::Placement {
            player: PlayerId::new(*player_id),
            coords: *coords,
        })
        .unwrap();
    }

    // Game might or might not be over depending on the board state
    // The important thing is all moves executed successfully
    assert!(game.available_cells().len() < 10);
}

#[test]
fn test_union_find_correctly_merges_components() {
    let mut game = GameY::new(4);

    // Create two separate components for player 0
    // Component 1: touches side A
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 0, 3), // Side A and B
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(3, 0, 0), // Player 1's piece
    })
    .unwrap();

    // Component 2: touches side C
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 3, 0), // Side A and C
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(2, 1, 0),
    })
    .unwrap();

    // Connect the components
    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 1, 2), // Side A - connects the chain
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(1),
        coords: Coordinates::new(2, 0, 1),
    })
    .unwrap();

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(0, 2, 1), // Final connection - should win
    })
    .unwrap();

    // Player 0 should now have won by connecting all three sides via side A
    assert!(game.check_game_over());
    match game.status() {
        GameStatus::Finished { winner } => {
            assert_eq!(*winner, PlayerId::new(0));
        }
        _ => panic!("Player 0 should have won"),
    }
}
