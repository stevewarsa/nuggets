import { getSuggestions } from "./src/models/passage-utils";

test("Tests will ensure that suggestions coming back for a search term are correct", () => {
    let suggestions: string[] = getSuggestions("Gal");
    expect(suggestions.length).toBe(6);
});
