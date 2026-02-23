import { OfficeType } from "../../../src/models/enums/OfficeType";

describe("OfficeType Enum", () => {
  it("should contain all expected office types", () => {
    expect(OfficeType.ARCHITECTURAL_BARRIERS).toBe("architectural_barriers");
    expect(OfficeType.PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS).toBe("public_green_areas_and_playgrounds");
    expect(OfficeType.PUBLIC_LIGHTING).toBe("public_lighting");
    expect(OfficeType.WATER_SUPPLY).toBe("water_supply");
    expect(OfficeType.WASTE).toBe("waste");
    expect(OfficeType.ROAD_SIGNS_AND_TRAFFIC_LIGHTS).toBe("road_signs_and_traffic_lights");
    expect(OfficeType.ROADS_AND_URBAN_FURNISHINGS).toBe("roads_and_urban_furnishings");
    expect(OfficeType.ORGANIZATION).toBe("organization");
    expect(OfficeType.OTHER).toBe("other");
  });

  it("should have 9 values", () => {
    expect(Object.keys(OfficeType)).toHaveLength(9);
  });

  it("should allow usage as type", () => {
    const office: OfficeType = OfficeType.ROADS_AND_URBAN_FURNISHINGS;
    expect(office).toBe("roads_and_urban_furnishings");
  });

  it("should not allow invalid values", () => {
    // @ts-expect-error
    const invalid: OfficeType = "invalid";
    expect(invalid).toBe("invalid");
  });
});