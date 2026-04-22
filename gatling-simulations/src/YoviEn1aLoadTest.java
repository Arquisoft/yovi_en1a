import java.time.Duration;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Stream;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class YoviEn1aLoadTest extends Simulation {

    // ── Service URLs (matching docker-compose ports exactly) ──────────────────
    private String WEBAPP_URL    = "http://localhost:80";   // webapp container → port 80
    private String USERS_URL     = "http://localhost:3000"; // users container  → port 3000
    private String GAMEY_API_URL = "http://localhost:3001"; // gameyapi container → port 3001

    // ── Feeder ────────────────────────────────────────────────────────────────
    // Generates a unique user per virtual user — no CSV needed, no duplicates ever
    private Iterator<Map<String, Object>> userFeeder = Stream.generate(
        (Supplier<Map<String, Object>>) () -> {
            String uuid = UUID.randomUUID().toString();
            Map<String, Object> user = new HashMap<>();
            user.put("username", "user_" + uuid);
            user.put("email",    "test_" + uuid + "@yovi.com");
            user.put("password", "Password123!");
            return user;
        }
    ).iterator();

    // ── HTTP Protocol ─────────────────────────────────────────────────────────
    private HttpProtocolBuilder httpProtocol = http
        .baseUrl(WEBAPP_URL)           // GET / hits port 80 (webapp/nginx)
        .inferHtmlResources()
        .acceptHeader("*/*")
        .acceptEncodingHeader("gzip, deflate, br")
        .acceptLanguageHeader("es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7")
        .userAgentHeader("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0");

    // ── Headers ───────────────────────────────────────────────────────────────
    private Map<String, String> headers_0 = Map.of(
        "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Upgrade-Insecure-Requests", "1"
    );

    private Map<String, String> headers_json = Map.of(
        "Content-Type", "application/json"
    );

    // ── Scenario ──────────────────────────────────────────────────────────────
    private ScenarioBuilder scn = scenario("Load Test - Randomized Users")
        .feed(userFeeder)

        // Step 1 — Load the frontend (webapp on port 80)
        .exec(
            http("GET Home Page")
                .get("/")
                .headers(headers_0)
                .check(status().is(200))
        )
        .pause(2, 5)

        // Step 2 — Create a unique user (users service on port 3000)
        // Server returns 200 (not 201) — checked against actual server code
        .exec(
            http("POST Create User")
                .post(USERS_URL + "/createuser")
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .body(ElFileBody("com/yovi/loadtest/yovien1aloadtest/createuser_body.json"))
                .asJson()
                .check(status().is(200))
                .check(jsonPath("$.token").saveAs("authToken"))
        )
        .exitHereIfFailed()
        .pause(2, 4)

        // Step 3 — Load lobby view (frontend)
        .exec(
            http("GET Lobby View")
                .get("/?view=lobby")
                .headers(headers_0)
                .check(status().is(200))
        )
        .pause(1, 2)

        // Step 4 — Get user profile (gamey-service on port 3001)
        .exec(
            http("GET User Profile")
                .get(GAMEY_API_URL + "/profile")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .check(status().is(200))
        )
        .pause(1, 3)

        // Step 5 — Load game view (frontend)
        .exec(
            http("GET Game View - PvC Beginner 11x11")
                .get("/?view=game&mode=pvc&difficulty=beginner&size=11")
                .headers(headers_0)
                .check(status().is(200))
        )
        .pause(1, 2)

        // Step 6 — Create a new game session (each user gets their own gameId)
        .exec(
            http("POST Create Game")
                .post(GAMEY_API_URL + "/play/create")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0011_request.json"))
                .asJson()
                .check(status().is(200))
                .check(jsonPath("$.gameId").saveAs("gameId"))
        )
        .exitHereIfFailed()
        .pause(1, 2)

        // Steps 7-17 — Game moves
        // Each user plays on their own session via #{gameId} saved above
        .exec(
            http("POST Game Move 1")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0013_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 2")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0014_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 3")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0015_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 4")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0016_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 5")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0017_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 6")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0018_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 7")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0019_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 8")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0020_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 9")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0021_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 10")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0022_request.json"))
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 11")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0023_request.json"))
                .check(status().is(200))
        );

    // ── Load Injection ────────────────────────────────────────────────────────
    // Ramps from 0 → ~5 users/sec over ~130 seconds
    // Equivalent to roughly 5, 10, 20, 50 concurrent users at each stage
    {
        setUp(
            scn.injectOpen(
                // Stage 1 — ~5 users
                rampUsersPerSec(0).to(0.5).during(Duration.ofSeconds(10)).randomized(),
                constantUsersPerSec(0.5).during(Duration.ofSeconds(10)).randomized(),

                // Stage 2 — ~10 users
                rampUsersPerSec(0.5).to(1).during(Duration.ofSeconds(10)).randomized(),
                constantUsersPerSec(1).during(Duration.ofSeconds(10)).randomized(),

                // Stage 3 — ~20 users
                rampUsersPerSec(1).to(2).during(Duration.ofSeconds(15)).randomized(),
                constantUsersPerSec(2).during(Duration.ofSeconds(15)).randomized(),

                // Stage 4 — ~50 users (bottleneck detection zone)
                rampUsersPerSec(2).to(5).during(Duration.ofSeconds(30)).randomized(),
                constantUsersPerSec(5).during(Duration.ofSeconds(30)).randomized()
            )
        )
        .protocols(httpProtocol)
        .assertions(
            // 95% of all requests must respond under 2 seconds
            global().responseTime().percentile(95).lt(2000),
            // Less than 1% of requests can fail
            global().failedRequests().percent().lt(1.0)
        );
    }
}