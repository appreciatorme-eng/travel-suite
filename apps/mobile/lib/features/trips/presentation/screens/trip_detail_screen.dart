import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:gobuddy_mobile/features/trips/data/repositories/driver_repository.dart';
import 'package:gobuddy_mobile/features/trips/domain/models/driver.dart';
import 'package:gobuddy_mobile/features/trips/presentation/widgets/driver_info_card.dart';

import 'package:gobuddy_mobile/core/services/notification_service.dart';
import 'package:gobuddy_mobile/core/config/supabase_config.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

class TripDetailScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  final String? tripId;

  const TripDetailScreen({super.key, this.trip, this.tripId})
    : assert(
        trip != null || tripId != null,
        'Either trip or tripId must be provided',
      );

  @override
  State<TripDetailScreen> createState() => _TripDetailScreenState();
}

class _TripDetailScreenState extends State<TripDetailScreen> {
  int _selectedDayIndex = 0;
  List<DriverAssignment> _assignments = [];
  bool _loadingDriver = true;
  bool _loadingTrip = false;
  Map<String, dynamic>? _trip;
  bool _isDriverForTrip = false;
  bool _sharingLocation = false;
  bool _startingLocationShare = false;
  Timer? _locationTimer;

  @override
  void initState() {
    super.initState();
    _trip = widget.trip;
    if (_trip == null && widget.tripId != null) {
      _fetchTripDetails();
    } else {
      _updateDriverMode();
      _loadDriverAssignments();
    }
  }

  Future<void> _fetchTripDetails() async {
    setState(() => _loadingTrip = true);
    try {
      final response = await Supabase.instance.client
          .from('trips')
          .select('*, itineraries(*)')
          .eq('id', widget.tripId!)
          .single();

      if (mounted) {
        setState(() {
          _trip = response;
          _loadingTrip = false;
        });
        await _updateDriverMode();
        _loadDriverAssignments();
      }
    } catch (e) {
      debugPrint('Error fetching trip details: $e');
      if (mounted) setState(() => _loadingTrip = false);
    }
  }

  Future<void> _loadDriverAssignments() async {
    if (_trip == null) return;

    final repo = DriverRepository(Supabase.instance.client);
    final tripId = _trip!['id'];
    if (tripId != null) {
      final results = await repo.getDriverAssignments(tripId);
      if (mounted) {
        setState(() {
          _assignments = results;
          _loadingDriver = false;
        });
      }
    } else {
      if (mounted) setState(() => _loadingDriver = false);
    }
  }

  Future<void> _updateDriverMode() async {
    final currentUserId = Supabase.instance.client.auth.currentUser?.id;
    final driverId = _trip?['driver_id'] as String?;
    final tripId = _trip?['id'] as String?;
    var isDriver =
        currentUserId != null && driverId != null && currentUserId == driverId;

    if (!isDriver && currentUserId != null && tripId != null) {
      try {
        final driverAccount = await Supabase.instance.client
            .from('driver_accounts')
            .select('external_driver_id')
            .eq('profile_id', currentUserId)
            .eq('is_active', true)
            .maybeSingle();

        final externalDriverId =
            driverAccount?['external_driver_id'] as String?;
        if (externalDriverId != null && externalDriverId.isNotEmpty) {
          final assignment = await Supabase.instance.client
              .from('trip_driver_assignments')
              .select('id')
              .eq('trip_id', tripId)
              .eq('external_driver_id', externalDriverId)
              .limit(1)
              .maybeSingle();
          isDriver = assignment != null;
        }
      } catch (_) {
        // Fallback to direct trip.driver_id detection only.
      }
    }

    if (!mounted) return;
    setState(() {
      _isDriverForTrip = isDriver;
    });
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  Future<void> _toggleLocationSharing() async {
    if (!_isDriverForTrip) return;

    if (_sharingLocation) {
      _stopLocationSharing();
      return;
    }

    setState(() => _startingLocationShare = true);
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are disabled');
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission denied');
      }

      await _sendCurrentLocationPing();
      _locationTimer = Timer.periodic(const Duration(seconds: 20), (_) async {
        await _sendCurrentLocationPing();
      });

      if (mounted) {
        setState(() => _sharingLocation = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Live location sharing started'),
            backgroundColor: AppTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Unable to start location sharing: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _startingLocationShare = false);
    }
  }

  void _stopLocationSharing() {
    _locationTimer?.cancel();
    _locationTimer = null;
    if (!mounted) return;
    setState(() => _sharingLocation = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Live location sharing stopped'),
        backgroundColor: Colors.black87,
      ),
    );
  }

  Future<void> _sendCurrentLocationPing() async {
    final tripId = _trip?['id'] as String?;
    if (tripId == null) return;

    final session = Supabase.instance.client.auth.currentSession;
    final accessToken = session?.accessToken;
    if (accessToken == null) return;

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );

    final uri = Uri.parse('${SupabaseConfig.apiBaseUrl}/api/location/ping');
    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'tripId': tripId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'heading': position.heading,
        'speed': position.speed,
        'accuracy': position.accuracy,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Ping failed (${response.statusCode})');
    }
  }

  Future<void> _openLiveLocationForDay() async {
    try {
      final tripId = _trip?['id'] as String?;
      if (tripId == null) {
        throw Exception('Missing trip ID');
      }

      final session = Supabase.instance.client.auth.currentSession;
      final accessToken = session?.accessToken;
      if (accessToken == null) {
        throw Exception('User session expired');
      }

      final dayNumber = _selectedDayIndex + 1;
      final uri = Uri.parse(
        '${SupabaseConfig.apiBaseUrl}/api/location/client-share?tripId=$tripId&dayNumber=$dayNumber',
      );

      final response = await http.get(
        uri,
        headers: {'Authorization': 'Bearer $accessToken'},
      );

      final payload = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception(payload['error'] ?? 'Failed to get live location link');
      }

      final liveUrl =
          (payload['share'] as Map<String, dynamic>?)?['live_url'] as String?;
      if (liveUrl == null || liveUrl.isEmpty) {
        throw Exception('Live location link unavailable');
      }

      final liveUri = Uri.parse(liveUrl);
      final launched = await launchUrl(
        liveUri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        throw Exception('Could not open live location link');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Unable to open live location: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _notifyLanded() async {
    try {
      final tripId = _trip?['id'] as String?;
      if (tripId == null) {
        throw Exception('Missing trip ID');
      }

      final session = Supabase.instance.client.auth.currentSession;
      final accessToken = session?.accessToken;
      if (accessToken == null) {
        throw Exception('User session expired');
      }

      final uri = Uri.parse(
        '${SupabaseConfig.apiBaseUrl}/api/notifications/client-landed',
      );

      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
        },
        body: jsonEncode({'tripId': tripId}),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('Failed to notify server');
      }

      // Show local confirmation notification
      final itinerary = _trip?['itineraries'] as Map<String, dynamic>?;
      final destination =
          itinerary?['destination'] ?? _trip?['destination'] ?? 'GoBuddy';
      await NotificationService().showNotification(
        id: 1,
        title: 'Welcome to $destination!',
        body: 'Your driver has been notified of your arrival.',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Driver notified via App System!'),
            backgroundColor: AppTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error notifying driver: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Map<String, dynamic> get rawData {
    final itinerary = _trip?['itineraries'] as Map<String, dynamic>?;
    final itineraryRaw = itinerary?['raw_data'] as Map<String, dynamic>?;
    final directRaw = _trip?['raw_data'] as Map<String, dynamic>?;
    return itineraryRaw ?? directRaw ?? {};
  }

  List<dynamic> get days => rawData['days'] as List<dynamic>? ?? [];

  @override
  Widget build(BuildContext context) {
    if (_loadingTrip || _trip == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      );
    }

    final itinerary = _trip!['itineraries'] as Map<String, dynamic>?;
    final destination =
        itinerary?['destination'] ?? _trip!['destination'] ?? 'Trip Details';

    return Scaffold(
      backgroundColor: Colors.white,
      body: _loadingDriver
          ? Center(
              child: Shimmer.fromColors(
                baseColor: Colors.grey[300]!,
                highlightColor: Colors.grey[100]!,
                child: Container(color: Colors.white),
              ),
            )
          : CustomScrollView(
              slivers: [
                SliverAppBar(
                  expandedHeight: 200,
                  pinned: true,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded),
                    onPressed: () => Navigator.pop(context),
                  ),
                  actions: [
                    if (_isDriverForTrip)
                      IconButton(
                        icon: Icon(
                          _sharingLocation
                              ? Icons.location_off_rounded
                              : Icons.location_searching_rounded,
                          color: _sharingLocation
                              ? Colors.amber.shade100
                              : Colors.white,
                        ),
                        tooltip: _sharingLocation
                            ? 'Stop live location'
                            : 'Start live location',
                        onPressed: _startingLocationShare
                            ? null
                            : _toggleLocationSharing,
                      ),
                    IconButton(
                      icon: const Icon(Icons.share_rounded),
                      onPressed: () {
                        // TODO: Share
                      },
                    ),
                  ],
                  flexibleSpace: FlexibleSpaceBar(
                    title: Text(
                      destination,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    background: Hero(
                      tag: 'trip-bg-${_trip!['id']}',
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [AppTheme.primary, AppTheme.secondary],
                          ),
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.landscape_rounded,
                            size: 64,
                            color: Colors.white24,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                if (days.isNotEmpty)
                  SliverPersistentHeader(
                    pinned: true,
                    delegate: _DaySelectorDelegate(
                      days: days,
                      selectedIndex: _selectedDayIndex,
                      onSelect: (index) =>
                          setState(() => _selectedDayIndex = index),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 80),
                    child: days.isEmpty
                        ? const SizedBox(
                            height: 200,
                            child: Center(child: Text('No itinerary data')),
                          )
                        : _buildDayContent(days[_selectedDayIndex])
                              .animate(key: ValueKey(_selectedDayIndex))
                              .fadeIn(duration: 400.ms),
                  ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _notifyLanded,
        backgroundColor: AppTheme.primary,
        icon: const Icon(Icons.flight_land_rounded),
        label: const Text("I've Landed"),
      ),
    );
  }

  Widget _buildDayContent(dynamic dayData) {
    final day = dayData as Map<String, dynamic>;
    final theme = day['theme'] ?? '';
    final activities = day['activities'] as List<dynamic>? ?? [];

    // Check for driver assignment for this day (1-based index)
    final assignment = _assignments.firstWhere(
      (a) => a.dayNumber == _selectedDayIndex + 1,
      orElse: () => const DriverAssignment(
        id: '',
        tripId: '',
        driverId: '',
        dayNumber: -1,
      ),
    );
    final hasDriver = assignment.dayNumber != -1;

    // Collect coordinates for map
    final markers = <Marker>[];
    for (final activity in activities) {
      final coords = activity['coordinates'] as Map<String, dynamic>?;
      if (coords != null) {
        final lat = coords['lat'] as num?;
        final lng = coords['lng'] as num?;
        if (lat != null && lng != null) {
          markers.add(
            Marker(
              point: LatLng(lat.toDouble(), lng.toDouble()),
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withAlpha(51), blurRadius: 4),
                  ],
                ),
                padding: const EdgeInsets.all(8),
                child: const Icon(Icons.place, color: Colors.white, size: 16),
              ),
            ),
          );
        }
      }
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Day Theme
          if (theme.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                theme,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          const SizedBox(height: 16),

          if (hasDriver) ...[
            DriverInfoCard(assignment: assignment),
            if (!_isDriverForTrip)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _openLiveLocationForDay,
                    icon: const Icon(Icons.navigation_rounded),
                    label: const Text('View Live Driver Location'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: BorderSide(color: AppTheme.primary.withAlpha(120)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 16),
          ],

          // Map
          if (markers.isNotEmpty)
            Container(
              height: 200,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withAlpha(26), blurRadius: 10),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: markers.first.point,
                  initialZoom: 13,
                ),
                children: [
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  ),
                  MarkerLayer(markers: markers),
                ],
              ),
            ),

          // Activities
          ...activities.asMap().entries.map((entry) {
            final index = entry.key;
            final activity = entry.value as Map<String, dynamic>;
            return _buildActivityCard(activity, index, activities.length);
          }),

          const SizedBox(height: 100), // FAB clearance
        ],
      ),
    );
  }

  Widget _buildActivityCard(
    Map<String, dynamic> activity,
    int index,
    int total,
  ) {
    final time = activity['time'] ?? '';
    final title = activity['title'] ?? 'Activity';
    final description = activity['description'] ?? '';
    final location = activity['location'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline
          Column(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              if (index < total - 1) // Show line between items
                Container(
                  width: 2,
                  height: 60,
                  color: AppTheme.primary.withAlpha(77),
                ),
            ],
          ),
          const SizedBox(width: 12),
          // Card
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(13),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (time.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary.withAlpha(26),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        time,
                        style: TextStyle(
                          color: AppTheme.secondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  if (description.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                  if (location.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.location_on_outlined,
                          size: 14,
                          color: Colors.grey.shade500,
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            location,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DaySelectorDelegate extends SliverPersistentHeaderDelegate {
  final List<dynamic> days;
  final int selectedIndex;
  final ValueChanged<int> onSelect;

  _DaySelectorDelegate({
    required this.days,
    required this.selectedIndex,
    required this.onSelect,
  });

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Colors.white,
      height: 60,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: days.length,
        itemBuilder: (context, index) {
          final isSelected = index == selectedIndex;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text('Day ${index + 1}'),
              selected: isSelected,
              onSelected: (_) => onSelect(index),
              selectedColor: AppTheme.primary,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : Colors.black87,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              showCheckmark: false,
              backgroundColor: Colors.grey[100],
              side: BorderSide.none,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  double get maxExtent => 60;

  @override
  double get minExtent => 60;

  @override
  bool shouldRebuild(covariant _DaySelectorDelegate oldDelegate) {
    return oldDelegate.selectedIndex != selectedIndex ||
        oldDelegate.days != days;
  }
}
