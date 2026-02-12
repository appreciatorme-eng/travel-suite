import 'package:flutter/foundation.dart';
import 'package:gobuddy_mobile/features/trips/domain/models/driver.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DriverRepository {
  final SupabaseClient _supabase;

  DriverRepository(this._supabase);

  Future<List<DriverAssignment>> getDriverAssignments(String tripId) async {
    try {
      final response = await _supabase
          .from('trip_driver_assignments')
          .select('*, driver:external_drivers(*)')
          .eq('trip_id', tripId);

      final List<dynamic> data = response as List<dynamic>;
      return data.map((json) {
        final driverJson = json['driver'];
        final assignment = DriverAssignment.fromJson(json);
        
        if (driverJson != null) {
           return assignment.copyWith(driver: Driver.fromJson(driverJson));
        }
        return assignment;
      }).toList();
    } catch (e) {
      // If table doesn't exist or policy blocks, return empty
      debugPrint('Error fetching driver assignments: $e');
      return [];
    }
  }
}
