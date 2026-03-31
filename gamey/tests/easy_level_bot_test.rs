use gamey::{Coordinates, GameY, Movement, PlayerId, YBot};
use gamey::easy_level_bot;

#[test]
fn test_easy_bot_name() {
    let bot = easy_level_bot;
    assert_eq!(bot.name(), "easy_level_bot");
}

#[test]
fn test_easy_bot_returns_move_on_empty_board() {
    let bot = easy_level_bot;
    let game = GameY::new(5);

    let chosen_move = bot.choose_move(&game);
    assert!(chosen_move.is_some(), "Bot should return a move on an empty board");
}

#[test]
fn test_easy_bot_returns_valid_coordinates() {
    let bot = easy_level_bot;
    let game = GameY::new(5);

    let coords = bot.choose_move(&game).unwrap();
    let index = coords.to_index(game.board_size());

    // The total number of cells on a hex board of size N is (N * (N + 1)) / 2
    assert!(index < 15, "Chosen coordinates must be within board limits");
}

#[test]
fn test_easy_bot_returns_none_on_full_board() {
    let bot = easy_level_bot;
    let mut game = GameY::new(2);

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

    assert!(game.available_cells().is_empty(), "Board must be full for this test");
    let chosen_move = bot.choose_move(&game);
    assert!(chosen_move.is_none(), "Bot should return None on a full board");
}

#[test]
fn test_easy_bot_chooses_from_available_cells() {
    let bot = easy_level_bot;
    let mut game = GameY::new(3);

    game.add_move(Movement::Placement {
        player: PlayerId::new(0),
        coords: Coordinates::new(2, 0, 0),
    })
    .unwrap();

    let coords = bot.choose_move(&game).unwrap();
    let index = coords.to_index(game.board_size());

    assert!(game.available_cells().contains(&index), "Bot selected an occupied cell");
}

#[test]
fn test_easy_bot_multiple_calls_return_valid_moves() {
    let bot = easy_level_bot;
    let game = GameY::new(7);

    // Verify that the random selection consistently returns valid cells over multiple runs
    for _ in 0..10 {
        let coords = bot.choose_move(&game).unwrap(); // Noktalı virgül eklendi!
        let index = coords.to_index(game.board_size());

        assert!(index < 28);
        assert!(game.available_cells().contains(&index));
    }
}