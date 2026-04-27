import java.time.Duration;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Stream;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class YoviEn1aLoadTest extends Simulation {

    private String WEBAPP_URL    = "http://20.199.137.85:80";   
    private String USERS_URL     = "http://20.199.137.85:3000"; 
    private String GAMEY_API_URL = "http://20.199.137.85:3001";

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

    private HttpProtocolBuilder httpProtocol = http
        .baseUrl(WEBAPP_URL)          
        .inferHtmlResources()
        .acceptHeader("*/*")
        .acceptEncodingHeader("gzip, deflate, br")
        .acceptLanguageHeader("es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7")
        .userAgentHeader("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0");

    private Map<String, String> headers_0 = Map.of(
        "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Upgrade-Insecure-Requests", "1"
    );

    private Map<String, String> headers_json = Map.of(
        "Content-Type", "application/json"
    );

    
    private ScenarioBuilder scn = scenario("Load Test - Randomized Users")
        .feed(userFeeder)

        .exec(
            http("GET Home Page")
                .get("/")
                .headers(headers_0)
                .check(status().is(200))
        )
        .pause(2, 5)

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

        .exec(
            http("GET Lobby View")
                .get("/?view=lobby")
                .headers(headers_0)
                .check(status().is(200))
        )
        .pause(1, 2)

        .exec(
            http("GET User Profile")
                .get(GAMEY_API_URL + "/profile")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .check(status().is(200))
        )
        .pause(1, 3)

        .exec(
            http("GET Game View - PvC Beginner 11x11")
                .get("/?view=game&mode=pvc&difficulty=beginner&size=11")
                .headers(headers_0)
                .check(status().is(200))
        )
        .pause(1, 2)

        .exec(
            http("POST Create Game")
                .post(GAMEY_API_URL + "/play/create")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0011_request.json"))
                .asJson()
                .check(status().is(201))
                .check(jsonPath("$.gameId").saveAs("gameId"))
        )
        .exitHereIfFailed()
        .pause(1, 2)

        .exec(
            http("POST Game Move 1")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0013_request.json"))
                .asJson()
                .check(status().is(200))
                
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 2")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0014_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 3")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0015_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 4")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0016_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 5")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0017_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 6")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0018_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 7")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0019_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 8")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0020_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 9")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0021_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 10")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0022_request.json"))
                .asJson()
                .check(status().is(200))
        )
        .pause(1, 2)
        .exec(
            http("POST Game Move 11")
                .post(GAMEY_API_URL + "/play/#{gameId}/move")
                .header("authorization", session -> "Bearer " + session.getString("authToken"))
                .body(RawFileBody("com/yovi/loadtest/yovien1aloadtest/0023_request.json"))
                .asJson()
                .check(status().is(200))
        );
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
            // 95% of all requests must respond under 2 seconds
            global().responseTime().percentile(95).lt(2000),
            // Less than 1% of requests can fail
            global().failedRequests().percent().lt(1.0)
        );
    }
}