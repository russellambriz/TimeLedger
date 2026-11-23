export type Category = {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
};

export type Session = {
  id: string;
  categoryId: string;
  start: number;
  end: number;
};

export type ActiveTimer = {
  startedAt: number;
  categoryId: string;
};

export type Drink = {
  id: string;
  name: string;
  /** Caffeine in milligrams. */
  mg: number;
  /** When it was drunk (ms). */
  at: number;
};

export type SleepTimer = {
  startedAt: number;
};

export type State = {
  version: 1;
  categories: Category[];
  sessions: Session[];
  active: ActiveTimer | null;
  lastCategoryId: string;
  /** Running sleep timer (separate from the focus timer). */
  sleep?: SleepTimer | null;
  /** Nightly sleep goal in minutes. */
  sleepGoal?: number;
  /** Logged caffeinated drinks. */
  drinks?: Drink[];
  /** Daily caffeine limit in mg. */
  caffeineLimit?: number;
};
