Feature: User Authentication
  As a new user
  I want to register and log in
  So that I can access the game

  Scenario: Register a new account and log in
    Given I am on the login page

    # 1. Registration Flow
    When I click "Don't have an account? Register here"
    And I fill in "Username" with "E2EPlayer"
    And I fill in "Email Address" with "e2e@example.com"
    And I fill in "Password" with "password123"
    And I click "REGISTER"
    Then I should see "SELECT MODE:"

    # 2. Logout to test real Login Flow
    When I click "Logout"
    Then I should see "Register here"

    # 3. Explicit Login Flow
    When I fill in "Username" with "E2EPlayer"
    And I fill in "Password" with "password123"
    And I click "LOGIN"
    Then I should see "SELECT MODE:"

    # 4. Logout
    When I click "Logout"
    Then I should see "Register here"
