import React from 'react';
import clsx from 'clsx';

export const VisitedBadge = ({ visited }: { visited: boolean }) => (
  <span className={clsx('pill', visited ? 'pill--success' : 'pill--muted')}>
    {visited ? 'Visited' : 'Not yet'}
  </span>
);
