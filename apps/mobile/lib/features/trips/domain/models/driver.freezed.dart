// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'driver.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Driver {

 String get id;@JsonKey(name: 'full_name') String get fullName; String get phone;@JsonKey(name: 'vehicle_type') String? get vehicleType;@JsonKey(name: 'vehicle_plate') String? get vehiclePlate;@JsonKey(name: 'vehicle_capacity') int? get vehicleCapacity;@JsonKey(name: 'photo_url') String? get photoUrl; String? get notes;
/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DriverCopyWith<Driver> get copyWith => _$DriverCopyWithImpl<Driver>(this as Driver, _$identity);

  /// Serializes this Driver to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Driver&&(identical(other.id, id) || other.id == id)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.vehicleType, vehicleType) || other.vehicleType == vehicleType)&&(identical(other.vehiclePlate, vehiclePlate) || other.vehiclePlate == vehiclePlate)&&(identical(other.vehicleCapacity, vehicleCapacity) || other.vehicleCapacity == vehicleCapacity)&&(identical(other.photoUrl, photoUrl) || other.photoUrl == photoUrl)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,fullName,phone,vehicleType,vehiclePlate,vehicleCapacity,photoUrl,notes);

@override
String toString() {
  return 'Driver(id: $id, fullName: $fullName, phone: $phone, vehicleType: $vehicleType, vehiclePlate: $vehiclePlate, vehicleCapacity: $vehicleCapacity, photoUrl: $photoUrl, notes: $notes)';
}


}

/// @nodoc
abstract mixin class $DriverCopyWith<$Res>  {
  factory $DriverCopyWith(Driver value, $Res Function(Driver) _then) = _$DriverCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'full_name') String fullName, String phone,@JsonKey(name: 'vehicle_type') String? vehicleType,@JsonKey(name: 'vehicle_plate') String? vehiclePlate,@JsonKey(name: 'vehicle_capacity') int? vehicleCapacity,@JsonKey(name: 'photo_url') String? photoUrl, String? notes
});




}
/// @nodoc
class _$DriverCopyWithImpl<$Res>
    implements $DriverCopyWith<$Res> {
  _$DriverCopyWithImpl(this._self, this._then);

  final Driver _self;
  final $Res Function(Driver) _then;

/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? fullName = null,Object? phone = null,Object? vehicleType = freezed,Object? vehiclePlate = freezed,Object? vehicleCapacity = freezed,Object? photoUrl = freezed,Object? notes = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,phone: null == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String,vehicleType: freezed == vehicleType ? _self.vehicleType : vehicleType // ignore: cast_nullable_to_non_nullable
as String?,vehiclePlate: freezed == vehiclePlate ? _self.vehiclePlate : vehiclePlate // ignore: cast_nullable_to_non_nullable
as String?,vehicleCapacity: freezed == vehicleCapacity ? _self.vehicleCapacity : vehicleCapacity // ignore: cast_nullable_to_non_nullable
as int?,photoUrl: freezed == photoUrl ? _self.photoUrl : photoUrl // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [Driver].
extension DriverPatterns on Driver {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Driver value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Driver value)  $default,){
final _that = this;
switch (_that) {
case _Driver():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Driver value)?  $default,){
final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'full_name')  String fullName,  String phone, @JsonKey(name: 'vehicle_type')  String? vehicleType, @JsonKey(name: 'vehicle_plate')  String? vehiclePlate, @JsonKey(name: 'vehicle_capacity')  int? vehicleCapacity, @JsonKey(name: 'photo_url')  String? photoUrl,  String? notes)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that.id,_that.fullName,_that.phone,_that.vehicleType,_that.vehiclePlate,_that.vehicleCapacity,_that.photoUrl,_that.notes);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'full_name')  String fullName,  String phone, @JsonKey(name: 'vehicle_type')  String? vehicleType, @JsonKey(name: 'vehicle_plate')  String? vehiclePlate, @JsonKey(name: 'vehicle_capacity')  int? vehicleCapacity, @JsonKey(name: 'photo_url')  String? photoUrl,  String? notes)  $default,) {final _that = this;
switch (_that) {
case _Driver():
return $default(_that.id,_that.fullName,_that.phone,_that.vehicleType,_that.vehiclePlate,_that.vehicleCapacity,_that.photoUrl,_that.notes);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'full_name')  String fullName,  String phone, @JsonKey(name: 'vehicle_type')  String? vehicleType, @JsonKey(name: 'vehicle_plate')  String? vehiclePlate, @JsonKey(name: 'vehicle_capacity')  int? vehicleCapacity, @JsonKey(name: 'photo_url')  String? photoUrl,  String? notes)?  $default,) {final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that.id,_that.fullName,_that.phone,_that.vehicleType,_that.vehiclePlate,_that.vehicleCapacity,_that.photoUrl,_that.notes);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Driver implements Driver {
  const _Driver({required this.id, @JsonKey(name: 'full_name') required this.fullName, required this.phone, @JsonKey(name: 'vehicle_type') this.vehicleType, @JsonKey(name: 'vehicle_plate') this.vehiclePlate, @JsonKey(name: 'vehicle_capacity') this.vehicleCapacity, @JsonKey(name: 'photo_url') this.photoUrl, this.notes});
  factory _Driver.fromJson(Map<String, dynamic> json) => _$DriverFromJson(json);

@override final  String id;
@override@JsonKey(name: 'full_name') final  String fullName;
@override final  String phone;
@override@JsonKey(name: 'vehicle_type') final  String? vehicleType;
@override@JsonKey(name: 'vehicle_plate') final  String? vehiclePlate;
@override@JsonKey(name: 'vehicle_capacity') final  int? vehicleCapacity;
@override@JsonKey(name: 'photo_url') final  String? photoUrl;
@override final  String? notes;

/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DriverCopyWith<_Driver> get copyWith => __$DriverCopyWithImpl<_Driver>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DriverToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Driver&&(identical(other.id, id) || other.id == id)&&(identical(other.fullName, fullName) || other.fullName == fullName)&&(identical(other.phone, phone) || other.phone == phone)&&(identical(other.vehicleType, vehicleType) || other.vehicleType == vehicleType)&&(identical(other.vehiclePlate, vehiclePlate) || other.vehiclePlate == vehiclePlate)&&(identical(other.vehicleCapacity, vehicleCapacity) || other.vehicleCapacity == vehicleCapacity)&&(identical(other.photoUrl, photoUrl) || other.photoUrl == photoUrl)&&(identical(other.notes, notes) || other.notes == notes));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,fullName,phone,vehicleType,vehiclePlate,vehicleCapacity,photoUrl,notes);

@override
String toString() {
  return 'Driver(id: $id, fullName: $fullName, phone: $phone, vehicleType: $vehicleType, vehiclePlate: $vehiclePlate, vehicleCapacity: $vehicleCapacity, photoUrl: $photoUrl, notes: $notes)';
}


}

/// @nodoc
abstract mixin class _$DriverCopyWith<$Res> implements $DriverCopyWith<$Res> {
  factory _$DriverCopyWith(_Driver value, $Res Function(_Driver) _then) = __$DriverCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'full_name') String fullName, String phone,@JsonKey(name: 'vehicle_type') String? vehicleType,@JsonKey(name: 'vehicle_plate') String? vehiclePlate,@JsonKey(name: 'vehicle_capacity') int? vehicleCapacity,@JsonKey(name: 'photo_url') String? photoUrl, String? notes
});




}
/// @nodoc
class __$DriverCopyWithImpl<$Res>
    implements _$DriverCopyWith<$Res> {
  __$DriverCopyWithImpl(this._self, this._then);

  final _Driver _self;
  final $Res Function(_Driver) _then;

/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? fullName = null,Object? phone = null,Object? vehicleType = freezed,Object? vehiclePlate = freezed,Object? vehicleCapacity = freezed,Object? photoUrl = freezed,Object? notes = freezed,}) {
  return _then(_Driver(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,fullName: null == fullName ? _self.fullName : fullName // ignore: cast_nullable_to_non_nullable
as String,phone: null == phone ? _self.phone : phone // ignore: cast_nullable_to_non_nullable
as String,vehicleType: freezed == vehicleType ? _self.vehicleType : vehicleType // ignore: cast_nullable_to_non_nullable
as String?,vehiclePlate: freezed == vehiclePlate ? _self.vehiclePlate : vehiclePlate // ignore: cast_nullable_to_non_nullable
as String?,vehicleCapacity: freezed == vehicleCapacity ? _self.vehicleCapacity : vehicleCapacity // ignore: cast_nullable_to_non_nullable
as int?,photoUrl: freezed == photoUrl ? _self.photoUrl : photoUrl // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$DriverAssignment {

 String get id;@JsonKey(name: 'trip_id') String get tripId;@JsonKey(name: 'external_driver_id') String? get driverId;@JsonKey(name: 'day_number') int get dayNumber;@JsonKey(name: 'pickup_time') String? get pickupTime;@JsonKey(name: 'pickup_location') String? get pickupLocation;@JsonKey(name: 'dropoff_location') String? get dropoffLocation;// We will manually populate this field after fetching the driver
@JsonKey(includeFromJson: false, includeToJson: false) Driver? get driver;
/// Create a copy of DriverAssignment
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DriverAssignmentCopyWith<DriverAssignment> get copyWith => _$DriverAssignmentCopyWithImpl<DriverAssignment>(this as DriverAssignment, _$identity);

  /// Serializes this DriverAssignment to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is DriverAssignment&&(identical(other.id, id) || other.id == id)&&(identical(other.tripId, tripId) || other.tripId == tripId)&&(identical(other.driverId, driverId) || other.driverId == driverId)&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.pickupTime, pickupTime) || other.pickupTime == pickupTime)&&(identical(other.pickupLocation, pickupLocation) || other.pickupLocation == pickupLocation)&&(identical(other.dropoffLocation, dropoffLocation) || other.dropoffLocation == dropoffLocation)&&(identical(other.driver, driver) || other.driver == driver));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,tripId,driverId,dayNumber,pickupTime,pickupLocation,dropoffLocation,driver);

@override
String toString() {
  return 'DriverAssignment(id: $id, tripId: $tripId, driverId: $driverId, dayNumber: $dayNumber, pickupTime: $pickupTime, pickupLocation: $pickupLocation, dropoffLocation: $dropoffLocation, driver: $driver)';
}


}

/// @nodoc
abstract mixin class $DriverAssignmentCopyWith<$Res>  {
  factory $DriverAssignmentCopyWith(DriverAssignment value, $Res Function(DriverAssignment) _then) = _$DriverAssignmentCopyWithImpl;
@useResult
$Res call({
 String id,@JsonKey(name: 'trip_id') String tripId,@JsonKey(name: 'external_driver_id') String? driverId,@JsonKey(name: 'day_number') int dayNumber,@JsonKey(name: 'pickup_time') String? pickupTime,@JsonKey(name: 'pickup_location') String? pickupLocation,@JsonKey(name: 'dropoff_location') String? dropoffLocation,@JsonKey(includeFromJson: false, includeToJson: false) Driver? driver
});


$DriverCopyWith<$Res>? get driver;

}
/// @nodoc
class _$DriverAssignmentCopyWithImpl<$Res>
    implements $DriverAssignmentCopyWith<$Res> {
  _$DriverAssignmentCopyWithImpl(this._self, this._then);

  final DriverAssignment _self;
  final $Res Function(DriverAssignment) _then;

/// Create a copy of DriverAssignment
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? tripId = null,Object? driverId = freezed,Object? dayNumber = null,Object? pickupTime = freezed,Object? pickupLocation = freezed,Object? dropoffLocation = freezed,Object? driver = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,tripId: null == tripId ? _self.tripId : tripId // ignore: cast_nullable_to_non_nullable
as String,driverId: freezed == driverId ? _self.driverId : driverId // ignore: cast_nullable_to_non_nullable
as String?,dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,pickupTime: freezed == pickupTime ? _self.pickupTime : pickupTime // ignore: cast_nullable_to_non_nullable
as String?,pickupLocation: freezed == pickupLocation ? _self.pickupLocation : pickupLocation // ignore: cast_nullable_to_non_nullable
as String?,dropoffLocation: freezed == dropoffLocation ? _self.dropoffLocation : dropoffLocation // ignore: cast_nullable_to_non_nullable
as String?,driver: freezed == driver ? _self.driver : driver // ignore: cast_nullable_to_non_nullable
as Driver?,
  ));
}
/// Create a copy of DriverAssignment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DriverCopyWith<$Res>? get driver {
    if (_self.driver == null) {
    return null;
  }

  return $DriverCopyWith<$Res>(_self.driver!, (value) {
    return _then(_self.copyWith(driver: value));
  });
}
}


/// Adds pattern-matching-related methods to [DriverAssignment].
extension DriverAssignmentPatterns on DriverAssignment {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _DriverAssignment value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _DriverAssignment() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _DriverAssignment value)  $default,){
final _that = this;
switch (_that) {
case _DriverAssignment():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _DriverAssignment value)?  $default,){
final _that = this;
switch (_that) {
case _DriverAssignment() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'trip_id')  String tripId, @JsonKey(name: 'external_driver_id')  String? driverId, @JsonKey(name: 'day_number')  int dayNumber, @JsonKey(name: 'pickup_time')  String? pickupTime, @JsonKey(name: 'pickup_location')  String? pickupLocation, @JsonKey(name: 'dropoff_location')  String? dropoffLocation, @JsonKey(includeFromJson: false, includeToJson: false)  Driver? driver)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _DriverAssignment() when $default != null:
return $default(_that.id,_that.tripId,_that.driverId,_that.dayNumber,_that.pickupTime,_that.pickupLocation,_that.dropoffLocation,_that.driver);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id, @JsonKey(name: 'trip_id')  String tripId, @JsonKey(name: 'external_driver_id')  String? driverId, @JsonKey(name: 'day_number')  int dayNumber, @JsonKey(name: 'pickup_time')  String? pickupTime, @JsonKey(name: 'pickup_location')  String? pickupLocation, @JsonKey(name: 'dropoff_location')  String? dropoffLocation, @JsonKey(includeFromJson: false, includeToJson: false)  Driver? driver)  $default,) {final _that = this;
switch (_that) {
case _DriverAssignment():
return $default(_that.id,_that.tripId,_that.driverId,_that.dayNumber,_that.pickupTime,_that.pickupLocation,_that.dropoffLocation,_that.driver);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id, @JsonKey(name: 'trip_id')  String tripId, @JsonKey(name: 'external_driver_id')  String? driverId, @JsonKey(name: 'day_number')  int dayNumber, @JsonKey(name: 'pickup_time')  String? pickupTime, @JsonKey(name: 'pickup_location')  String? pickupLocation, @JsonKey(name: 'dropoff_location')  String? dropoffLocation, @JsonKey(includeFromJson: false, includeToJson: false)  Driver? driver)?  $default,) {final _that = this;
switch (_that) {
case _DriverAssignment() when $default != null:
return $default(_that.id,_that.tripId,_that.driverId,_that.dayNumber,_that.pickupTime,_that.pickupLocation,_that.dropoffLocation,_that.driver);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _DriverAssignment implements DriverAssignment {
  const _DriverAssignment({required this.id, @JsonKey(name: 'trip_id') required this.tripId, @JsonKey(name: 'external_driver_id') this.driverId, @JsonKey(name: 'day_number') required this.dayNumber, @JsonKey(name: 'pickup_time') this.pickupTime, @JsonKey(name: 'pickup_location') this.pickupLocation, @JsonKey(name: 'dropoff_location') this.dropoffLocation, @JsonKey(includeFromJson: false, includeToJson: false) this.driver});
  factory _DriverAssignment.fromJson(Map<String, dynamic> json) => _$DriverAssignmentFromJson(json);

@override final  String id;
@override@JsonKey(name: 'trip_id') final  String tripId;
@override@JsonKey(name: 'external_driver_id') final  String? driverId;
@override@JsonKey(name: 'day_number') final  int dayNumber;
@override@JsonKey(name: 'pickup_time') final  String? pickupTime;
@override@JsonKey(name: 'pickup_location') final  String? pickupLocation;
@override@JsonKey(name: 'dropoff_location') final  String? dropoffLocation;
// We will manually populate this field after fetching the driver
@override@JsonKey(includeFromJson: false, includeToJson: false) final  Driver? driver;

/// Create a copy of DriverAssignment
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DriverAssignmentCopyWith<_DriverAssignment> get copyWith => __$DriverAssignmentCopyWithImpl<_DriverAssignment>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DriverAssignmentToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _DriverAssignment&&(identical(other.id, id) || other.id == id)&&(identical(other.tripId, tripId) || other.tripId == tripId)&&(identical(other.driverId, driverId) || other.driverId == driverId)&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.pickupTime, pickupTime) || other.pickupTime == pickupTime)&&(identical(other.pickupLocation, pickupLocation) || other.pickupLocation == pickupLocation)&&(identical(other.dropoffLocation, dropoffLocation) || other.dropoffLocation == dropoffLocation)&&(identical(other.driver, driver) || other.driver == driver));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,tripId,driverId,dayNumber,pickupTime,pickupLocation,dropoffLocation,driver);

@override
String toString() {
  return 'DriverAssignment(id: $id, tripId: $tripId, driverId: $driverId, dayNumber: $dayNumber, pickupTime: $pickupTime, pickupLocation: $pickupLocation, dropoffLocation: $dropoffLocation, driver: $driver)';
}


}

/// @nodoc
abstract mixin class _$DriverAssignmentCopyWith<$Res> implements $DriverAssignmentCopyWith<$Res> {
  factory _$DriverAssignmentCopyWith(_DriverAssignment value, $Res Function(_DriverAssignment) _then) = __$DriverAssignmentCopyWithImpl;
@override @useResult
$Res call({
 String id,@JsonKey(name: 'trip_id') String tripId,@JsonKey(name: 'external_driver_id') String? driverId,@JsonKey(name: 'day_number') int dayNumber,@JsonKey(name: 'pickup_time') String? pickupTime,@JsonKey(name: 'pickup_location') String? pickupLocation,@JsonKey(name: 'dropoff_location') String? dropoffLocation,@JsonKey(includeFromJson: false, includeToJson: false) Driver? driver
});


@override $DriverCopyWith<$Res>? get driver;

}
/// @nodoc
class __$DriverAssignmentCopyWithImpl<$Res>
    implements _$DriverAssignmentCopyWith<$Res> {
  __$DriverAssignmentCopyWithImpl(this._self, this._then);

  final _DriverAssignment _self;
  final $Res Function(_DriverAssignment) _then;

/// Create a copy of DriverAssignment
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? tripId = null,Object? driverId = freezed,Object? dayNumber = null,Object? pickupTime = freezed,Object? pickupLocation = freezed,Object? dropoffLocation = freezed,Object? driver = freezed,}) {
  return _then(_DriverAssignment(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,tripId: null == tripId ? _self.tripId : tripId // ignore: cast_nullable_to_non_nullable
as String,driverId: freezed == driverId ? _self.driverId : driverId // ignore: cast_nullable_to_non_nullable
as String?,dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,pickupTime: freezed == pickupTime ? _self.pickupTime : pickupTime // ignore: cast_nullable_to_non_nullable
as String?,pickupLocation: freezed == pickupLocation ? _self.pickupLocation : pickupLocation // ignore: cast_nullable_to_non_nullable
as String?,dropoffLocation: freezed == dropoffLocation ? _self.dropoffLocation : dropoffLocation // ignore: cast_nullable_to_non_nullable
as String?,driver: freezed == driver ? _self.driver : driver // ignore: cast_nullable_to_non_nullable
as Driver?,
  ));
}

/// Create a copy of DriverAssignment
/// with the given fields replaced by the non-null parameter values.
@override
@pragma('vm:prefer-inline')
$DriverCopyWith<$Res>? get driver {
    if (_self.driver == null) {
    return null;
  }

  return $DriverCopyWith<$Res>(_self.driver!, (value) {
    return _then(_self.copyWith(driver: value));
  });
}
}

// dart format on
