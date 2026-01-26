/// Configuration options for rendering the game board.
///
/// Controls what information is displayed when rendering the board to text.
pub struct RenderOptions {
    /// If true, show barycentric (x, y, z) coordinates for each cell.
    pub show_3d_coords: bool,
    /// If true, show the linear index for each cell.
    pub show_idx: bool,
    /// If true, use ANSI color codes to distinguish players.
    pub show_colors: bool,
}

impl Default for RenderOptions {
    fn default() -> Self {
        RenderOptions {
            show_3d_coords: false,
            show_idx: true,
            show_colors: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_options() {
        let options = RenderOptions::default();
        assert!(!options.show_3d_coords);
        assert!(options.show_idx);
        assert!(options.show_colors);
    }

    #[test]
    fn test_custom_options() {
        let options = RenderOptions {
            show_3d_coords: true,
            show_idx: false,
            show_colors: false,
        };
        assert!(options.show_3d_coords);
        assert!(!options.show_idx);
        assert!(!options.show_colors);
    }
}
