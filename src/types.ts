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

export type State = {
  version: 1;
  categories: Category[];
  sessions: Session[];
  active: ActiveTimer | null;
  lastCategoryId: string;
};
