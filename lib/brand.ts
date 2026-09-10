/**
 * The house colour — what a shop gets before it picks its own, and what every
 * Pointili-owned surface (landing, auth, console, error screens) wears. The
 * same mauve as v1 so the mark on the home screen matches the app it opens.
 *
 * THE TRAP: shops.colour defaults to this value in the DATABASE (0001). Change
 * one and change the other, or a new shop's card and its swatch disagree.
 */
export const BRAND_COLOR = "#5b3fd1";

/** The tile the mark sits on — the same paper scripts/icons.mjs bakes into the
 *  app icons, so the install bar, the lockup and the home-screen icon are one
 *  object. */
export const BRAND_PAPER = "#f8f7fc";
