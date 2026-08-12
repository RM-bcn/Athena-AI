const DIGRAPHS: Record<string, string> = {
  "αι": "ai", "ει": "ei", "οι": "oi", "ου": "ou", "ευ": "ev", "αυ": "av",
  "ηυ": "iv", "γγ": "ng", "γκ": "gk", "γξ": "nx", "γχ": "nch", "μπ": "b",
  "ντ": "nt", "τζ": "tz", "τσ": "ts",
};

const SINGLES: Record<string, string> = {
  "α": "a", "β": "v", "γ": "g", "δ": "d", "ε": "e", "ζ": "z", "η": "i",
  "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m", "ν": "n", "ξ": "x",
  "ο": "o", "π": "p", "ρ": "r", "σ": "s", "ς": "s", "τ": "t", "υ": "i",
  "φ": "f", "χ": "ch", "ψ": "ps", "ω": "o",
  "ά": "a", "έ": "e", "ή": "i", "ί": "i", "ό": "o", "ύ": "i", "ώ": "o",
  "ϊ": "i", "ϋ": "i", "ΐ": "i", "ΰ": "i",
};

const UPPER_SINGLES: Record<string, string> = {
  "Α": "A", "Β": "V", "Γ": "G", "Δ": "D", "Ε": "E", "Ζ": "Z", "Η": "I",
  "Θ": "Th", "Ι": "I", "Κ": "K", "Λ": "L", "Μ": "M", "Ν": "N", "Ξ": "X",
  "Ο": "O", "Π": "P", "Ρ": "R", "Σ": "S", "Τ": "T", "Υ": "I", "Φ": "F",
  "Χ": "Ch", "Ψ": "Ps", "Ω": "O",
  "Ά": "A", "Έ": "E", "Ή": "I", "Ί": "I", "Ό": "O", "Ύ": "I", "Ώ": "O",
};

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase();
}

function fixCase(source: string, mapped: string): string {
  if (!mapped) return mapped;
  const allUpper = source.split("").every((c) => isUpper(c));
  if (allUpper) return mapped.toUpperCase();
  if (isUpper(source[0])) {
    return mapped.charAt(0).toUpperCase() + mapped.slice(1);
  }
  return mapped;
}

export function transliterateGreek(text: string): string {
  if (!text) return text;
  let out = "";
  let i = 0;
  while (i < text.length) {
    const lowerTwo = text.slice(i, i + 2).toLowerCase();
    if (DIGRAPHS[lowerTwo]) {
      out += fixCase(text.slice(i, i + 2), DIGRAPHS[lowerTwo]);
      i += 2;
      continue;
    }
    const ch = text[i];
    if (SINGLES[ch]) {
      out += SINGLES[ch];
    } else if (UPPER_SINGLES[ch]) {
      out += UPPER_SINGLES[ch];
    } else {
      out += ch;
    }
    i += 1;
  }
  return out;
}
