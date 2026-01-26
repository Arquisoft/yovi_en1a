use axum::{Json, http::StatusCode, response::IntoResponse};
use serde::{Deserialize, Serialize};

/// A structured error response returned by the bot server API.
///
/// This type is serialized to JSON and returned when API requests fail.
/// It includes context about which API version and bot were involved.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct ErrorResponse {
    /// The API version that was requested, if available.
    pub api_version: Option<String>,
    /// The bot ID that was requested, if available.
    pub bot_id: Option<String>,
    /// A human-readable error message describing what went wrong.
    pub message: String,
}

impl ErrorResponse {
    /// Creates a new error response with the given message and optional context.
    ///
    /// # Arguments
    /// * `message` - A description of the error
    /// * `api_version` - The API version from the request, if known
    /// * `bot_id` - The bot ID from the request, if known
    pub fn error(message: &str, api_version: Option<String>, bot_id: Option<String>) -> Self {
        Self {
            bot_id,
            api_version,
            message: message.to_string(),
        }
    }
}

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> axum::response::Response {
        (StatusCode::BAD_REQUEST, Json(self)).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_with_all_fields() {
        let err = ErrorResponse::error(
            "Something went wrong",
            Some("v1".to_string()),
            Some("random".to_string()),
        );
        assert_eq!(err.message, "Something went wrong");
        assert_eq!(err.api_version, Some("v1".to_string()));
        assert_eq!(err.bot_id, Some("random".to_string()));
    }

    #[test]
    fn test_error_with_no_context() {
        let err = ErrorResponse::error("Generic error", None, None);
        assert_eq!(err.message, "Generic error");
        assert_eq!(err.api_version, None);
        assert_eq!(err.bot_id, None);
    }

    #[test]
    fn test_error_with_partial_context() {
        let err = ErrorResponse::error("Version error", Some("v2".to_string()), None);
        assert_eq!(err.message, "Version error");
        assert_eq!(err.api_version, Some("v2".to_string()));
        assert_eq!(err.bot_id, None);
    }

    #[test]
    fn test_serialize() {
        let err = ErrorResponse::error("Test error", Some("v1".to_string()), Some("bot1".to_string()));
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("\"message\":\"Test error\""));
        assert!(json.contains("\"api_version\":\"v1\""));
        assert!(json.contains("\"bot_id\":\"bot1\""));
    }

    #[test]
    fn test_deserialize() {
        let json = r#"{"api_version":"v1","bot_id":"random","message":"error msg"}"#;
        let err: ErrorResponse = serde_json::from_str(json).unwrap();
        assert_eq!(err.message, "error msg");
        assert_eq!(err.api_version, Some("v1".to_string()));
        assert_eq!(err.bot_id, Some("random".to_string()));
    }

    #[test]
    fn test_clone() {
        let err = ErrorResponse::error("Clone test", Some("v1".to_string()), None);
        let cloned = err.clone();
        assert_eq!(err, cloned);
    }
}
