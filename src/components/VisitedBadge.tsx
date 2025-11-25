import React from 'react';
import { classNames } from '../lib/classNames';

export const VisitedBadge = ({ visited }: { visited: boolean }) => (
  <span className={classNames('pill', visited ? 'pill--success' : 'pill--muted')}>
    {visited ? 'Visited' : 'Not yet'}
  </span>
);
