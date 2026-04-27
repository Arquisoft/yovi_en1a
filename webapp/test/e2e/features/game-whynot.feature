Feature: Why Not rule mode
  As a registered user
  I want to select the Why Not rule and start a game
  So that I can play an alternative game mode

  Scenario: Verify Why Not rule selection and transition to GameBoard
    Given I am on the login page
    When I fill in "Username" with "E2EPlayer"
    And I fill in "Password" with "password123"
    And I click "LOGIN"
    Then I should see "SELECT MODE:"
    When I click "Why Not"
    And I click "PLAY"
    And I click "START GAME"
    And I should see "P1: E2EPlayer"
