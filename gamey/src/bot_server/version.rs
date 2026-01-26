use crate::error::ErrorResponse;

/// The currently supported API version.
pub const SUPPORTED_VERSION: &str = "v1";

/// Validates that the requested API version is supported.
///
/// # Arguments
/// * `version` - The API version string from the request path
///
/// # Returns
/// * `Ok(())` if the version is supported
/// * `Err(ErrorResponse)` if the version is not supported
///
/// # Example
/// ```
/// use gamey::check_api_version;
///
/// assert!(check_api_version("v1").is_ok());
/// assert!(check_api_version("v2").is_err());
/// ```
pub fn check_api_version(version: &str) -> Result<(), ErrorResponse> {
    if version != SUPPORTED_VERSION {
        Err(ErrorResponse::error(
            &format!(
                "Unsupported API version: {}. Supported version is {}",
                version, SUPPORTED_VERSION
            ),
            Some(version.to_string()),
            None,
        ))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_supported_version() {
        assert!(check_api_version("v1").is_ok());
    }

    #[test]
    fn test_unsupported_version_v2() {
        let result = check_api_version("v2");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.message.contains("Unsupported API version"));
        assert!(err.message.contains("v2"));
        assert_eq!(err.api_version, Some("v2".to_string()));
    }

    #[test]
    fn test_unsupported_version_empty() {
        let result = check_api_version("");
        assert!(result.is_err());
    }

    #[test]
    fn test_unsupported_version_random() {
        let result = check_api_version("random_version");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.api_version, Some("random_version".to_string()));
    }

    #[test]
    fn test_supported_version_constant() {
        assert_eq!(SUPPORTED_VERSION, "v1");
    }
}
