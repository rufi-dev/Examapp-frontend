// Grade ("Sinif") options used at sign-up and in the profile-completion gate.
export const GRADES = ["5", "6", "7", "8", "9", "10", "11", "Məzun"];

// Label for a grade value ("11" -> "11-ci sinif"; "Məzun" stays as-is).
export const gradeLabel = (g) => (g === "Məzun" ? "Məzun" : `${g}-ci sinif`);
