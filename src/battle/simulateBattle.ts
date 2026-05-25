import type { BattleResult, BattleTurn, PokemonDetails } from "../types";

type FighterState = {
  pokemon: PokemonDetails;
  hp: number;
};

const MAX_TURNS = 40;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const calculateDamage = (
  attacker: PokemonDetails,
  defender: PokemonDetails,
  turn: number,
) => {
  const offense = attacker.stats.attack * 0.7 + attacker.stats.specialAttack * 0.3;
  const defense = defender.stats.defense * 0.55 + defender.stats.specialDefense * 0.45;
  const tempo = attacker.stats.speed > defender.stats.speed ? 1.08 : 1;
  const variance = 0.9 + ((attacker.id * 13 + defender.id * 7 + turn) % 9) / 50;
  const rawDamage = ((offense * tempo) / Math.max(35, defense)) * 18 * variance;

  return clamp(Math.round(rawDamage), 4, 80);
};

const createTurn = (
  turn: number,
  attacker: FighterState,
  defender: FighterState,
): BattleTurn => {
  const damage = calculateDamage(attacker.pokemon, defender.pokemon, turn);
  defender.hp = Math.max(0, defender.hp - damage);

  return {
    turn,
    attacker: attacker.pokemon.name,
    defender: defender.pokemon.name,
    damage,
    defenderHp: defender.hp,
    message: `${attacker.pokemon.name} hits ${defender.pokemon.name} for ${damage} damage.`,
  };
};

export function simulateBattle(
  firstPokemon: PokemonDetails,
  secondPokemon: PokemonDetails,
): BattleResult {
  const first: FighterState = {
    pokemon: firstPokemon,
    hp: Math.max(1, firstPokemon.stats.hp),
  };
  const second: FighterState = {
    pokemon: secondPokemon,
    hp: Math.max(1, secondPokemon.stats.hp),
  };
  const turns: BattleTurn[] = [];
  const firstAttacker =
    first.pokemon.stats.speed >= second.pokemon.stats.speed ? first : second;
  const secondAttacker = firstAttacker === first ? second : first;

  for (let turn = 1; turn <= MAX_TURNS; turn += 1) {
    turns.push(createTurn(turn, firstAttacker, secondAttacker));

    if (secondAttacker.hp <= 0) {
      return {
        winner: firstAttacker.pokemon,
        loser: secondAttacker.pokemon,
        turns,
      };
    }

    turns.push(createTurn(turn, secondAttacker, firstAttacker));

    if (firstAttacker.hp <= 0) {
      return {
        winner: secondAttacker.pokemon,
        loser: firstAttacker.pokemon,
        turns,
      };
    }
  }

  const winner = first.hp >= second.hp ? first : second;
  const loser = winner === first ? second : first;

  return {
    winner: winner.pokemon,
    loser: loser.pokemon,
    turns,
  };
}
