import React from 'react';
import { Ship, Plane, CarTaxiFront, ArrowRightLeft } from 'lucide-react';
import type { TransportType } from './types';

interface Props {
  type: TransportType;
  className?: string;
}

/** Maps a TransportType to a lucide icon, mirroring the app's icon usage. */
export const TransportIcon: React.FC<Props> = ({ type, className }) => {
  switch (type) {
    case 'ferry':
      return <Ship className={className} />;
    case 'flight':
      return <Plane className={className} />;
    case 'transfer':
      return <CarTaxiFront className={className} />;
    default:
      return <ArrowRightLeft className={className} />;
  }
};
