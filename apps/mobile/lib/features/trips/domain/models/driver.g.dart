// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'driver.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Driver _$DriverFromJson(Map<String, dynamic> json) => _Driver(
  id: json['id'] as String,
  fullName: json['full_name'] as String,
  phone: json['phone'] as String,
  vehicleType: json['vehicle_type'] as String?,
  vehiclePlate: json['vehicle_plate'] as String?,
  vehicleCapacity: (json['vehicle_capacity'] as num?)?.toInt(),
  photoUrl: json['photo_url'] as String?,
  notes: json['notes'] as String?,
);

Map<String, dynamic> _$DriverToJson(_Driver instance) => <String, dynamic>{
  'id': instance.id,
  'full_name': instance.fullName,
  'phone': instance.phone,
  'vehicle_type': instance.vehicleType,
  'vehicle_plate': instance.vehiclePlate,
  'vehicle_capacity': instance.vehicleCapacity,
  'photo_url': instance.photoUrl,
  'notes': instance.notes,
};

_DriverAssignment _$DriverAssignmentFromJson(Map<String, dynamic> json) =>
    _DriverAssignment(
      id: json['id'] as String,
      tripId: json['trip_id'] as String,
      driverId: json['external_driver_id'] as String?,
      dayNumber: (json['day_number'] as num).toInt(),
      pickupTime: json['pickup_time'] as String?,
      pickupLocation: json['pickup_location'] as String?,
      dropoffLocation: json['dropoff_location'] as String?,
    );

Map<String, dynamic> _$DriverAssignmentToJson(_DriverAssignment instance) =>
    <String, dynamic>{
      'id': instance.id,
      'trip_id': instance.tripId,
      'external_driver_id': instance.driverId,
      'day_number': instance.dayNumber,
      'pickup_time': instance.pickupTime,
      'pickup_location': instance.pickupLocation,
      'dropoff_location': instance.dropoffLocation,
    };
