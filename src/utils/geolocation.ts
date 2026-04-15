import { getDistance } from 'geolib';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class GeolocationUtils {
  
  static calculateDistance(point1: Coordinates, point2: Coordinates): number {
    return getDistance(
      { latitude: point1.latitude, longitude: point1.longitude },
      { latitude: point2.latitude, longitude: point2.longitude }
    );
  }

  static isValidCoordinate(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  static formatAddress(location: any): string {
    const parts = [];
    if (location.name) parts.push(location.name);
    if (location.road) parts.push(location.road);
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.postcode) parts.push(location.postcode);
    if (location.country) parts.push(location.country);
    return parts.join(', ');
  }

  static getDistanceCategory(distanceMeters: number): string {
    if (distanceMeters < 100) return 'Very Close';
    if (distanceMeters < 500) return 'Close';
    if (distanceMeters < 1000) return 'Nearby';
    if (distanceMeters < 5000) return 'Moderate';
    return 'Far';
  }

  static validateVisitRadius(
    customerLat: number,
    customerLng: number,
    userLat: number,
    userLng: number,
    maxRadiusMeters: number = 100
  ): boolean {
    const distance = this.calculateDistance(
      { latitude: customerLat, longitude: customerLng },
      { latitude: userLat, longitude: userLng }
    );
    return distance <= maxRadiusMeters;
  }
}