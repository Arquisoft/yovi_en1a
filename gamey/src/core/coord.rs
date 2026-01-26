use std::fmt::Display;

use serde::{Deserialize, Serialize};

/// Represents barycentric coordinates (x, y, z) on a triangular board.
///
/// In a triangular board of size N, valid coordinates satisfy:
/// - x + y + z = N - 1
/// - x, y, z >= 0
///
/// Each coordinate component indicates the distance from one of the three sides:
/// - x = 0 means the cell touches side A
/// - y = 0 means the cell touches side B
/// - z = 0 means the cell touches side C
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Coordinates {
    x: u32,
    y: u32,
    z: u32,
}

impl Coordinates {
    /// Creates new coordinates with the given x, y, z values.
    pub fn new(x: u32, y: u32, z: u32) -> Self {
        Self { x, y, z }
    }

    /// Returns the x coordinate (distance from side A).
    pub fn x(&self) -> u32 {
        self.x
    }

    /// Returns the y coordinate (distance from side B).
    pub fn y(&self) -> u32 {
        self.y
    }

    /// Returns the z coordinate (distance from side C).
    pub fn z(&self) -> u32 {
        self.z
    }

    /// Converts a linear index to barycentric coordinates (x, y, z).
    ///
    /// The index follows row-major order starting from the top of the triangle.
    /// For a board of size N, indices go from 0 to N*(N+1)/2 - 1.
    pub fn from_index(index: u32, board_size: u32) -> Self {
        // As i = (r * (r + 1)) / 2
        // r = floor((sqrt(8*i + 1) - 1) / 2)
        let i_f = index as f64;
        let r = (((8.0 * i_f + 1.0).sqrt() - 1.0) / 2.0).floor() as u32;

        let row_start_index = (r * (r + 1)) / 2;
        let c = index - row_start_index;

        let x = board_size - 1 - r;
        let y = c;
        let z = (board_size - 1) - x - y;

        Coordinates::new(x, y, z)
    }

    /// Converts these coordinates to a linear index.
    ///
    /// This is the inverse of `from_index`.
    pub fn to_index(&self, board_size: u32) -> u32 {
        let r = (board_size - 1) - self.x;
        let row_start_index = (r * (r + 1)) / 2;
        let c = self.y;
        row_start_index + c
    }

    /// Creates coordinates from a slice of 3 u32 values.
    ///
    /// Returns `None` if the slice does not have exactly 3 elements.
    pub fn from_vec(coords: &[u32]) -> Option<Self> {
        if coords.len() != 3 {
            return None;
        }
        Some(Self {
            x: coords[0],
            y: coords[1],
            z: coords[2],
        })
    }

    /// Returns true if this cell touches side A (x == 0).
    pub fn touches_side_a(&self) -> bool {
        self.x == 0
    }

    /// Returns true if this cell touches side B (y == 0).
    pub fn touches_side_b(&self) -> bool {
        self.y == 0
    }

    /// Returns true if this cell touches side C (z == 0).
    pub fn touches_side_c(&self) -> bool {
        self.z == 0
    }
}

impl From<Coordinates> for Vec<u32> {
    fn from(coords: Coordinates) -> Self {
        vec![coords.x, coords.y, coords.z]
    }
}

impl Display for Coordinates {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "({}, {}, {})", self.x, self.y, self.z)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    #[test]
    fn test_coordinates_conversion() {
        let coords = Coordinates::new(1, 2, 3);
        let index = coords.to_index(7);
        let converted = Coordinates::from_index(index, 7);
        assert_eq!(coords, converted);
    }

    #[test]
    fn test_coordinates_sides() {
        let coords_a = Coordinates::new(0, 2, 2);
        let coords_b = Coordinates::new(2, 0, 2);
        let coords_c = Coordinates::new(2, 2, 0);
        assert!(coords_a.touches_side_a());
        assert!(coords_b.touches_side_b());
        assert!(coords_c.touches_side_c());
    }

    #[test]
    fn test_new_coordinates() {
        let coords = Coordinates::new(1, 2, 3);
        assert_eq!(coords.x(), 1);
        assert_eq!(coords.y(), 2);
        assert_eq!(coords.z(), 3);
    }

    #[test]
    fn test_from_vec_valid() {
        let coords = Coordinates::from_vec(&[1, 2, 3]);
        assert!(coords.is_some());
        let coords = coords.unwrap();
        assert_eq!(coords.x(), 1);
        assert_eq!(coords.y(), 2);
        assert_eq!(coords.z(), 3);
    }

    #[test]
    fn test_from_vec_invalid_length() {
        assert!(Coordinates::from_vec(&[1, 2]).is_none());
        assert!(Coordinates::from_vec(&[1, 2, 3, 4]).is_none());
        assert!(Coordinates::from_vec(&[]).is_none());
    }

    #[test]
    fn test_into_vec() {
        let coords = Coordinates::new(1, 2, 3);
        let vec: Vec<u32> = coords.into();
        assert_eq!(vec, vec![1, 2, 3]);
    }

    #[test]
    fn test_display() {
        let coords = Coordinates::new(1, 2, 3);
        assert_eq!(format!("{}", coords), "(1, 2, 3)");
    }

    #[test]
    fn test_index_roundtrip_all_cells() {
        let board_size = 5;
        let total_cells = (board_size * (board_size + 1)) / 2;
        for idx in 0..total_cells {
            let coords = Coordinates::from_index(idx, board_size);
            let back = coords.to_index(board_size);
            assert_eq!(idx, back, "Index {} did not roundtrip correctly", idx);
        }
    }

    #[test]
    fn test_corner_touches_two_sides() {
        // Top corner touches sides B and C (y=0 and z=0)
        let top = Coordinates::new(4, 0, 0);
        assert!(!top.touches_side_a());
        assert!(top.touches_side_b());
        assert!(top.touches_side_c());
    }

    #[test]
    fn test_interior_cell_touches_no_sides() {
        let interior = Coordinates::new(1, 1, 1);
        assert!(!interior.touches_side_a());
        assert!(!interior.touches_side_b());
        assert!(!interior.touches_side_c());
    }

    // Property-based tests using proptest

    proptest! {
        /// Property: Converting an index to coordinates and back yields the same index.
        #[test]
        fn prop_index_to_coords_roundtrip(board_size in 1u32..=20, idx_factor in 0.0f64..1.0) {
            let total_cells = (board_size * (board_size + 1)) / 2;
            let idx = ((idx_factor * total_cells as f64) as u32).min(total_cells - 1);
            let coords = Coordinates::from_index(idx, board_size);
            let back = coords.to_index(board_size);
            prop_assert_eq!(idx, back, "Index {} did not roundtrip for board_size {}", idx, board_size);
        }

        /// Property: Coordinates from an index always satisfy x + y + z = board_size - 1.
        #[test]
        fn prop_coords_sum_invariant(board_size in 1u32..=20, idx_factor in 0.0f64..1.0) {
            let total_cells = (board_size * (board_size + 1)) / 2;
            let idx = ((idx_factor * total_cells as f64) as u32).min(total_cells - 1);
            let coords = Coordinates::from_index(idx, board_size);
            let sum = coords.x() + coords.y() + coords.z();
            prop_assert_eq!(sum, board_size - 1,
                "Sum {} != {} for coords {:?} from index {} on board_size {}",
                sum, board_size - 1, coords, idx, board_size);
        }

        /// Property: For valid coordinates, converting to index and back yields the same coordinates.
        #[test]
        fn prop_coords_to_index_roundtrip(board_size in 2u32..=20, x_ratio in 0.0f64..1.0, y_ratio in 0.0f64..1.0) {
            // Generate valid coordinates where x + y + z = board_size - 1
            let n = board_size - 1;
            let x = (x_ratio * n as f64) as u32;
            let remaining = n - x;
            let y = (y_ratio * remaining as f64) as u32;
            let z = remaining - y;

            let coords = Coordinates::new(x, y, z);
            let idx = coords.to_index(board_size);
            let back = Coordinates::from_index(idx, board_size);
            prop_assert_eq!(coords, back,
                "Coords {:?} did not roundtrip for board_size {}", coords, board_size);
        }

        /// Property: All coordinate components are non-negative (ensured by u32).
        /// This test verifies the generated index is always within valid bounds.
        #[test]
        fn prop_index_within_bounds(board_size in 1u32..=20, idx_factor in 0.0f64..1.0) {
            let total_cells = (board_size * (board_size + 1)) / 2;
            let idx = ((idx_factor * total_cells as f64) as u32).min(total_cells - 1);
            let coords = Coordinates::from_index(idx, board_size);
            let back_idx = coords.to_index(board_size);
            prop_assert!(back_idx < total_cells,
                "Index {} out of bounds (max {}) for board_size {}", back_idx, total_cells - 1, board_size);
        }
    }
}
