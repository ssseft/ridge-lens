package org.ridgelens.mountain;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mountains")
public class MountainController {
  private final JdbcTemplate jdbc;

  public MountainController(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping
  public List<Mountain> list() {
    return jdbc.query(
        "SELECT id, name, longitude, latitude FROM mountains ORDER BY name, id",
        (row, index) ->
            new Mountain(
                row.getString("id"),
                row.getString("name"),
                row.getDouble("longitude"),
                row.getDouble("latitude")));
  }

  public record Mountain(String id, String name, double longitude, double latitude) {}
}
