use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use gamey::{Coordinates, GameY, Movement, PlayerId, RenderOptions};

/// Benchmarks for coordinate conversion functions
fn bench_coordinates(c: &mut Criterion) {
    let mut group = c.benchmark_group("coordinates");

    for board_size in [5, 10, 15, 20].iter() {
        let total_cells = (board_size * (board_size + 1)) / 2;

        group.bench_with_input(
            BenchmarkId::new("from_index", board_size),
            board_size,
            |b, &size| {
                b.iter(|| {
                    for idx in 0..total_cells {
                        black_box(Coordinates::from_index(idx, size));
                    }
                })
            },
        );

        group.bench_with_input(
            BenchmarkId::new("to_index", board_size),
            board_size,
            |b, &size| {
                let coords: Vec<_> = (0..total_cells)
                    .map(|idx| Coordinates::from_index(idx, size))
                    .collect();
                b.iter(|| {
                    for coord in &coords {
                        black_box(coord.to_index(size));
                    }
                })
            },
        );

        group.bench_with_input(
            BenchmarkId::new("roundtrip", board_size),
            board_size,
            |b, &size| {
                b.iter(|| {
                    for idx in 0..total_cells {
                        let coords = Coordinates::from_index(idx, size);
                        black_box(coords.to_index(size));
                    }
                })
            },
        );
    }

    group.finish();
}

/// Benchmarks for game creation
fn bench_game_creation(c: &mut Criterion) {
    let mut group = c.benchmark_group("game_creation");

    for board_size in [5, 10, 15, 20].iter() {
        group.bench_with_input(
            BenchmarkId::new("new", board_size),
            board_size,
            |b, &size| {
                b.iter(|| black_box(GameY::new(size)))
            },
        );
    }

    group.finish();
}

/// Benchmarks for adding moves to the game
fn bench_add_move(c: &mut Criterion) {
    let mut group = c.benchmark_group("add_move");

    for board_size in [5, 10, 15].iter() {
        let total_cells = (board_size * (board_size + 1)) / 2;

        // Benchmark adding a single move to an empty board
        group.bench_with_input(
            BenchmarkId::new("single_move", board_size),
            board_size,
            |b, &size| {
                b.iter_batched(
                    || GameY::new(size),
                    |mut game| {
                        let coords = Coordinates::from_index(0, size);
                        let movement = Movement::Placement {
                            player: PlayerId::new(0),
                            coords,
                        };
                        let _ = black_box(game.add_move(movement));
                        game
                    },
                    criterion::BatchSize::SmallInput,
                )
            },
        );

        // Benchmark filling half the board
        group.bench_with_input(
            BenchmarkId::new("half_board", board_size),
            board_size,
            |b, &size| {
                b.iter_batched(
                    || GameY::new(size),
                    |mut game| {
                        let half = total_cells / 2;
                        for idx in 0..half {
                            let coords = Coordinates::from_index(idx, size);
                            let player = PlayerId::new(idx % 2);
                            let movement = Movement::Placement { player, coords };
                            let _ = game.add_move(movement);
                        }
                        black_box(game)
                    },
                    criterion::BatchSize::SmallInput,
                )
            },
        );
    }

    group.finish();
}

/// Benchmarks for board rendering
fn bench_render(c: &mut Criterion) {
    let mut group = c.benchmark_group("render");

    let options_simple = RenderOptions {
        show_3d_coords: false,
        show_idx: false,
        show_colors: false,
    };

    let options_full = RenderOptions {
        show_3d_coords: true,
        show_idx: true,
        show_colors: true,
    };

    for board_size in [5, 10, 15].iter() {
        // Create a game with some moves
        let mut game = GameY::new(*board_size);
        let total_cells = (board_size * (board_size + 1)) / 2;
        for idx in 0..(total_cells / 3) {
            let coords = Coordinates::from_index(idx, *board_size);
            let player = PlayerId::new(idx % 2);
            let movement = Movement::Placement { player, coords };
            let _ = game.add_move(movement);
        }

        group.bench_with_input(
            BenchmarkId::new("simple", board_size),
            &game,
            |b, game| {
                b.iter(|| black_box(game.render(&options_simple)))
            },
        );

        group.bench_with_input(
            BenchmarkId::new("full_options", board_size),
            &game,
            |b, game| {
                b.iter(|| black_box(game.render(&options_full)))
            },
        );
    }

    group.finish();
}

/// Benchmarks for checking side touches
fn bench_touches_side(c: &mut Criterion) {
    let mut group = c.benchmark_group("touches_side");

    for board_size in [10, 20].iter() {
        let total_cells = (board_size * (board_size + 1)) / 2;
        let coords: Vec<_> = (0..total_cells)
            .map(|idx| Coordinates::from_index(idx, *board_size))
            .collect();

        group.bench_with_input(
            BenchmarkId::new("all_sides", board_size),
            &coords,
            |b, coords| {
                b.iter(|| {
                    for coord in coords {
                        black_box(coord.touches_side_a());
                        black_box(coord.touches_side_b());
                        black_box(coord.touches_side_c());
                    }
                })
            },
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_coordinates,
    bench_game_creation,
    bench_add_move,
    bench_render,
    bench_touches_side,
);

criterion_main!(benches);
