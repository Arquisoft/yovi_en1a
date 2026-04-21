Feature: Full Game Flow
  As a registered user
  I want to be able to log in, play games with different sizes and difficulties, and log out
  So that I can fully experience the web app

  Scenario: Play a game against the bot and logout
    Given I am on the login page
    
    # 1. Registration Flow
    When I click "Don't have an account? Register here"
    And I fill in "Username" with "E2EPlayer"
    And I fill in "Email Address" with "e2e@example.com"
    And I fill in "Password" with "password123"
    And I click "REGISTER"
    # Registration automatically logs the user in (arrives at Lobby)
    Then I should see "SELECT MODE:"

    # 2. Logout to test the real Login Flow
    When I click "Logout"
    # App.tsx unmounts Lobby and mounts StartPage (which defaults to 'login' mode)
    Then I should see "Register here"

    # 3. Explicit Login Flow
    # No need to toggle modes, we are currently looking at the Login screen
    When I fill in "Username" with "E2EPlayer"
    And I fill in "Password" with "password123"
    And I click "LOGIN"
    Then I should see "SELECT MODE:"
# multiple language changes test
    When I change the language to "Türkçe" and then back to "English"

    # 3 Full Matches: 3 Difficulties, 2 small boards, 1 medium board
    When I play a "BEGINNER" game on size 5
    And I play a "MEDIUM" game on size 7
    And I play a "ADVANCED" game on size 5
    
    # 4. Profile/Statistics Verification
    When I click the user profile button
    Then I should see "Stats"
    And I should see "Match History"
    
    # 5. Return to Lobby and Logout completely
    When I click "Play"
    Then I should see "SELECT MODE:"
    When I click "Logout"
    Then I should see "Register here"



    Scenario: Verify Why Not rule selection and transition to GameBoard
    Given I am on the login page
    When I fill in "Username" with "E2EPlayer"
    And I fill in "Password" with "password123"
    And I click "LOGIN"
    Then I should see "SELECT MODE:"
    When I click "Why Not"
    And I click "PLAY"
    And I click "START GAME"
    Then I should see "RULE: WHY NOT"
    And I should see "P1: E2EPlayer"
