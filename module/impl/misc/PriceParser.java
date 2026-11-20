package dev.orbit.client.module.impl.misc;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pulls an auction price out of an item's lore.
 *
 * <p>Servers format prices differently ("$1,250", "Price: 1250", "1.2k coins", "1250 ⛃"), so this
 * scans lore lines for a number, preferring lines that look like the price line.
 */
public final class PriceParser {
    /** 1,250 / 1.250 / 1250 / 1_250 */
    private static final Pattern NUMBER = Pattern.compile("(\\d[\\d.,]*\\d|\\d)");
    /** 1.2k / 12.5m / 3b */
    private static final Pattern SUFFIXED = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*([kmb])\\b",
            Pattern.CASE_INSENSITIVE);

    private PriceParser() {
    }

    /**
     * @param loreLines  lore lines, already stripped of colour codes
     * @param currency   currency marker the price line usually contains ("$", "coins", ...)
     * @param hint       word that marks the price line ("price")
     * @return parsed price, or -1 when no price was found
     */
    public static double parse(List<String> loreLines, String currency, String hint) {
        if (loreLines.isEmpty()) {
            return -1;
        }
        String currencyLower = currency == null ? "" : currency.toLowerCase();
        String hintLower = hint == null ? "" : hint.toLowerCase();

        double best = -1;
        for (String line : loreLines) {
            String lower = line.toLowerCase();
            boolean looksLikePrice = (!currencyLower.isEmpty() && lower.contains(currencyLower))
                    || (!hintLower.isEmpty() && lower.contains(hintLower));

            double value = firstNumber(line);
            if (value < 0) {
                continue;
            }
            if (looksLikePrice) {
                return value;       // a labelled price line wins immediately
            }
            if (best < 0) {
                best = value;
            }
        }
        return best;
    }

    /** First number on the line, honouring k/m/b suffixes. Returns -1 when there is none. */
    public static double firstNumber(String line) {
        Matcher suffixed = SUFFIXED.matcher(line);
        if (suffixed.find()) {
            double base = Double.parseDouble(suffixed.group(1).replace(',', '.'));
            double multiplier = switch (suffixed.group(2).toLowerCase()) {
                case "k" -> 1_000;
                case "m" -> 1_000_000;
                case "b" -> 1_000_000_000;
                default -> 1;
            };
            return base * multiplier;
        }

        Matcher matcher = NUMBER.matcher(line);
        if (!matcher.find()) {
            return -1;
        }
        String raw = matcher.group(1).replace(",", "").replace("_", "");
        // "1.250" is ambiguous: treat a single separator with 3 trailing digits as a thousands group
        if (raw.chars().filter(c -> c == '.').count() == 1 && raw.matches(".*\\.\\d{3}$")) {
            raw = raw.replace(".", "");
        } else {
            raw = raw.replace(".", "");
        }
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /** Strips vanilla formatting codes so lore text can be matched. */
    public static String stripFormatting(String text) {
        return text.replaceAll("§[0-9a-fk-orA-FK-OR]", "");
    }
}
