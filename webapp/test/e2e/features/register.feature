Feature: Register
  Validate the register form

  Scenario: Successful registration
    Given the register page is open
    When I enter "Alice" as the username and "password123" as the password and submit
    Then I should be redirected to the lobby