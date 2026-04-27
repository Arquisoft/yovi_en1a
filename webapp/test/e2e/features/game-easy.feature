Feature: Play an easy game
  As a registered user
  I want to play a beginner difficulty game
  So that I can enjoy the game at an easy level

  Scenario: Play a beginner game on a small board
    Given I am on the login page
    When I fill in "Username" with "E2EPlayer"
    And I fill in "Password" with "password123"
    And I click "LOGIN"
    Then I should see "SELECT MODE:"

    When I play a "BEGINNER" game on size 5

    When I click "Logout"
    Then I should see "Register here"
