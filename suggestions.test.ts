import {getSuggestions, getExactBookNameMatch, getNewSuggestions} from "./src/models/passage-utils";

test("Tests whether the search term is an exact book match", () => {
    let exactMatch: [string, string[]] = getExactBookNameMatch("Gal");
    expect(exactMatch[0]).toBe("galatians");

    exactMatch = getExactBookNameMatch("1 Co");
    expect(exactMatch[0]).toBe("1-corinthians");

    exactMatch = getExactBookNameMatch("1 Co ");
    expect(exactMatch[0]).toBe("1-corinthians");

    exactMatch = getExactBookNameMatch("1 Co :");
    expect(exactMatch).toBeFalsy();

    exactMatch = getExactBookNameMatch("1 Cor");
    expect(exactMatch).toBeFalsy();

    exactMatch = getExactBookNameMatch("1 Corinthians");
    expect(exactMatch[0]).toBe("1-corinthians");
});

test("Tests new get suggestions method", () => {
    let suggestions: string[] = getNewSuggestions("Gal");
    expect(suggestions.length).toBe(6);

    suggestions = getNewSuggestions("1 Co");
    expect(suggestions.length).toBe(16);

    suggestions = getNewSuggestions("1 Corinthians 15");
    expect(suggestions.length).toBe(58);
	
    suggestions = getNewSuggestions("Fred");
    expect(suggestions.length).toBe(0);
	
    suggestions = getNewSuggestions("");
    expect(suggestions.length).toBe(0);

    suggestions = getNewSuggestions("John 3:3");
    expect(suggestions.length).toBe(8);

    suggestions = getNewSuggestions("Galatians 5:22");
	// since this is an exact match, we would expect suggestions to be undefined
    expect(suggestions).toBeFalsy();
	expect(suggestions).toBe(undefined);

    suggestions = getNewSuggestions("1 Corinthians 15:5");
    // since this is NOT an exact match, we would expect all the verse suggestions to be starting with 5
    expect(suggestions.length).toBe(10);

    suggestions = getNewSuggestions("1 Corinthians 15:5", true);
    // since this is NOT an exact match, we would expect all the verse suggestions to be starting with 5
    expect(suggestions).toBeFalsy();
    expect(suggestions).toBe(undefined);

    suggestions = getNewSuggestions("1 Corinthians 15:58");
    // since this is an exact match, we would expect suggestions to be undefined
    expect(suggestions).toBeFalsy();
    expect(suggestions).toBe(undefined);
});
