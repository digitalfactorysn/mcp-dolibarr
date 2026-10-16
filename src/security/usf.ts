/**
 * Validateur de la syntaxe « Universal Search Filter » (USF) de Dolibarr.
 *
 *   (champ:opérateur:valeur)  combinables avec and / or et des parenthèses
 *   ex. ((t.datec:>=:'2025-01-01') and (t.nom:like:'Dupont%'))
 *
 * La syntaxe USF est la seule acceptée à partir de Dolibarr 24 ; on la valide
 * côté MCP avant d'envoyer le filtre, ce qui garantit qu'un utilisateur (ou une
 * injection de prompt) ne peut pas faire passer autre chose qu'un filtre bien
 * formé : champs et opérateurs en liste blanche, valeurs entre apostrophes sans
 * apostrophe interne, profondeur et taille bornées.
 */

const OPERATORS = new Set(['=', '<', '>', '<=', '>=', '!=', 'in', 'notin', 'like', 'notlike', 'is', 'isnot']);
const FIELD = /^[A-Za-z0-9_.\-]{1,64}$/;
const BARE_VALUE = /^[A-Za-z0-9_.\-]{1,64}$/;
const MAX_LENGTH = 1000;
const MAX_DEPTH = 8;
const MAX_CONDITIONS = 20;

export class UsfError extends Error {}

class Parser {
  private i = 0;
  private conditions = 0;
  constructor(private readonly s: string) {}

  parse(): void {
    this.ws();
    this.expr(0);
    this.ws();
    if (this.i !== this.s.length) this.fail('caractères inattendus en fin de filtre');
  }

  private fail(msg: string): never {
    throw new UsfError(`Filtre invalide (syntaxe USF) : ${msg} (position ${this.i}).`);
  }

  private ws(): void {
    while (this.i < this.s.length && /\s/.test(this.s[this.i] as string)) this.i++;
  }

  private expr(depth: number): void {
    if (depth > MAX_DEPTH) this.fail('imbrication trop profonde');
    this.term(depth);
    for (;;) {
      this.ws();
      const m = /^(and|or)(?=\s*\()/i.exec(this.s.slice(this.i));
      if (!m) return;
      this.i += m[0].length;
      this.ws();
      this.term(depth);
    }
  }

  private term(depth: number): void {
    if (this.s[this.i] !== '(') this.fail("'(' attendu");
    this.i++;
    this.ws();
    if (this.s[this.i] === '(') {
      this.expr(depth + 1);
      this.ws();
    } else {
      this.condition();
    }
    if (this.s[this.i] !== ')') this.fail("')' attendu");
    this.i++;
  }

  private condition(): void {
    if (++this.conditions > MAX_CONDITIONS) this.fail('trop de conditions');
    const field = this.token(/[A-Za-z0-9_.\-]/);
    if (!FIELD.test(field)) this.fail('nom de champ invalide');
    this.expect(':');
    const op = this.token(/[A-Za-z!<>=]/).toLowerCase();
    if (!OPERATORS.has(op)) this.fail(`opérateur non autorisé « ${op} »`);
    this.expect(':');
    this.value();
  }

  private value(): void {
    if (this.s[this.i] === "'") {
      this.i++;
      const start = this.i;
      while (this.i < this.s.length && this.s[this.i] !== "'") {
        const c = this.s.charCodeAt(this.i);
        if (c < 0x20 || c === 0x7f || this.s[this.i] === '\\') this.fail('caractère interdit dans une valeur');
        this.i++;
      }
      if (this.s[this.i] !== "'") this.fail('apostrophe de fermeture manquante');
      if (this.i - start > 200) this.fail('valeur trop longue');
      this.i++;
      return;
    }
    const v = this.token(/[A-Za-z0-9_.\-]/);
    if (!BARE_VALUE.test(v)) this.fail('valeur invalide (utilisez des apostrophes pour les chaînes)');
  }

  private token(re: RegExp): string {
    const start = this.i;
    while (this.i < this.s.length && re.test(this.s[this.i] as string)) this.i++;
    if (start === this.i) this.fail('élément attendu');
    return this.s.slice(start, this.i);
  }

  private expect(ch: string): void {
    if (this.s[this.i] !== ch) this.fail(`'${ch}' attendu`);
    this.i++;
  }
}

export function validateUsf(filter: string): string {
  if (typeof filter !== 'string') throw new UsfError('Filtre invalide : chaîne attendue.');
  if (filter.length > MAX_LENGTH) throw new UsfError('Filtre invalide : trop long.');
  new Parser(filter).parse();
  return filter;
}

export function isValidUsf(filter: string): boolean {
  try {
    validateUsf(filter);
    return true;
  } catch {
    return false;
  }
}

/** Échappe une valeur littérale pour l'insérer dans un filtre USF construit par le code. */
export function usfQuote(value: string): string {
  if (/['\\\x00-\x1f\x7f]/.test(value)) throw new UsfError('Valeur de filtre invalide.');
  return `'${value}'`;
}
