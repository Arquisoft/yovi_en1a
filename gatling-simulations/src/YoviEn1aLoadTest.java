import java.time.Duration;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Stream;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class YoviEn1aLoadTest extends Simulation {

    private String uri1 = "localhost";

    // --- FIXED FEEDER (Converted from Scala to Java) ---
    private Iterator<Map<String, Object>> userFeeder = Stream.generate((Supplier<Map<String, Object>>) () -> {
        String uuid = UUID.randomUUID().toString();
        Map<String, Object> user = new HashMap<>();
        user.put("username", "user_" + uuid);
        user.put("email", "test_" + uuid + "@yovi.com");
        user.put("password", "Password123!");
        return user;
    }).iterator();

    // --- HTTP PROTOCOL ---
    private HttpProtocolBuilder httpProtocol = http
        .baseUrl("http://localhost")
        .inferHtmlResources()
        .acceptHeader("*/*")
        .acceptEncodingHeader("gzip, deflate, br")
        .acceptLanguageHeader("es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7")
        .userAgentHeader("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0");

    // --- HEADERS ---
    private Map<String, String> headers_0 = Map.of(
        "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Upgrade-Insecure-Requests", "1"
    );

    private Map<String, String> headers_4 = Map.of(
        "Content-Type", "application/json",
        "Origin", "http://localhost",
        "Sec-Fetch-Mode", "cors"
    );

    // Dynamic headers use a lambda to resolve the token from the session
    private Map<String, String> headers_with_auth = Map.of(
        "Content-Type", "application/json",
        "Origin", "http://localhost"
    );

    // --- SCENARIO DEFINITION ---
    private ScenarioBuilder scn = scenario("Load Test - Randomized Users")
        .feed(userFeeder) 
        .exec(
            http("GET Home Page")
                .get("/")
                .headers(headers_0)
        )
        .pause(2)
        .exec(
            http("POST Create User")
                .post("http://" + uri1 + ":3000/createuser")
                .headers(headers_4)
                .body(StringBody("{\"username\": \"#{username}\", \"email\": \"#{email}\", \"password\": \"#{password}\"}"))
                .asJson()
                .check(status().is(201)) 
                .check(jsonPath("$.token").saveAs("authToken")) 
        )
        .exitHereIfFailed() 
        .pause(2)
        .exec(
            http("GET User Profile")
                .get("http://" + uri1 + ":3001/profile")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .check(status().is(200))
        )
        .exec(
            http("POST Create Game")
                .post("http://" + uri1 + ":3001/play/create")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0011_request.json"))
                .check(status().is(200))
                .check(jsonPath("$.gameId").saveAs("gameId"))
        )
        .exitHereIfFailed() 
        .exec(
            http("POST Game Move 1")
                .post("http://" + uri1 + ":3001/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0013_request.json"))
                .check(status().is(200))
        )
        .exec(
            http("POST Game Move 2")
                .post("http://" + uri1 + ":3001/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0014_request.json"))
                .check(status().is(200))
        );

    // --- SETUP BLOCK ---
    {
        setUp(
            scn.injectOpen(
                rampUsersPerSec(0).to(0.5).during(Duration.ofSeconds(10)).randomized(),
                constantUsersPerSec(0.5).during(Duration.ofSeconds(10)).randomized(),
                rampUsersPerSec(0.5).to(1).during(Duration.ofSeconds(10)).randomized(),
                constantUsersPerSec(1).during(Duration.ofSeconds(10)).randomized(),
                rampUsersPerSec(1).to(2).during(Duration.ofSeconds(15)).randomized(),
                constantUsersPerSec(2).during(Duration.ofSeconds(15)).randomized(),
                rampUsersPerSec(2).to(5).during(Duration.ofSeconds(30)).randomized(),
                constantUsersPerSec(5).during(Duration.ofSeconds(30)).randomized()
            )
        )
        .protocols(httpProtocol)
        .assertions(
            global().responseTime().percentile(95).lt(2000),
            global().failedRequests().percent().lt(1.0)
        );
    }
}