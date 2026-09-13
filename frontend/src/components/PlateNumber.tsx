import React from 'react';
import { HSRPPlate, HSRPPlateProps } from './HSRPPlate';

export type PlateNumberProps = HSRPPlateProps;

export const PlateNumber: React.FC<PlateNumberProps> = (props) => {
  return <HSRPPlate {...props} />;
};

export default PlateNumber;
