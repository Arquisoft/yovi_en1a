Feature: Play a difficult game
  As a registered user
  I want to play an advanced difficulty game
  So that I can test my skills at the highest level

  Scenario: Play an advanced game on a small board
    Given I am on the login page
    When I fill in "Username" with "E2EPlayer"
    And I fill in "Password" with "password123"
    And I click "LOGIN"
    Then I should see "SELECT MODE:"

    When I play a "ADVANCED" game on size 5

    When I click "Logout"
    Then I should see "Register here"
