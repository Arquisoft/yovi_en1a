use crate::core::SetIdx;

// Struct to track connected components in the Union-Find structure
#[derive(Clone, Debug)]
pub(crate) struct PlayerSet {
    pub parent: SetIdx,
    // We track which sides this specific set of pieces is touching
    pub touches_side_a: bool,
    pub touches_side_b: bool,
    pub touches_side_c: bool,
}

impl PlayerSet {
    /// Checks if this set connects all three sides of the board.
    pub fn is_winning_configuration(&self) -> bool {
        self.touches_side_a && self.touches_side_b && self.touches_side_c
    }
}
