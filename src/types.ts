export type PokemonSummary = {
  name: string;
  url: string;
};

export type PokemonDetails = {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprite: string;
  officialArtwork: string;
  types: string[];
  abilities: string[];
  moves: PokemonMove[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
};

export type PokemonMove = {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  damageClass: "physical" | "special";
};

export type BattleTurn = {
  turn: number;
  attacker: string;
  defender: string;
  damage: number;
  defenderHp: number;
  message: string;
};

export type BattleResult = {
  winner: PokemonDetails;
  loser: PokemonDetails;
  turns: BattleTurn[];
};
