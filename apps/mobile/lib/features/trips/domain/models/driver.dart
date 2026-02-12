// ignore_for_file: invalid_annotation_target

import 'package:freezed_annotation/freezed_annotation.dart';

part 'driver.freezed.dart';
part 'driver.g.dart';

@freezed
abstract class Driver with _$Driver {
  const factory Driver({
    required String id,
    @JsonKey(name: 'full_name') required String fullName,
    required String phone,
    @JsonKey(name: 'vehicle_type') String? vehicleType,
    @JsonKey(name: 'vehicle_plate') String? vehiclePlate,
    @JsonKey(name: 'vehicle_capacity') int? vehicleCapacity,
    @JsonKey(name: 'photo_url') String? photoUrl,
    String? notes,
  }) = _Driver;

  factory Driver.fromJson(Map<String, dynamic> json) => _$DriverFromJson(json);
}

@freezed
abstract class DriverAssignment with _$DriverAssignment {
  const factory DriverAssignment({
    required String id,
    @JsonKey(name: 'trip_id') required String tripId,
    @JsonKey(name: 'external_driver_id') String? driverId,
    @JsonKey(name: 'day_number') required int dayNumber,
    @JsonKey(name: 'pickup_time') String? pickupTime,
    @JsonKey(name: 'pickup_location') String? pickupLocation,
    @JsonKey(name: 'dropoff_location') String? dropoffLocation,
    // We will manually populate this field after fetching the driver
    @JsonKey(includeFromJson: false, includeToJson: false) Driver? driver,
  }) = _DriverAssignment;

  factory DriverAssignment.fromJson(Map<String, dynamic> json) => _$DriverAssignmentFromJson(json);
}
