import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/theme/app_theme.dart';
import 'trip_detail_screen.dart';
import '../../auth/presentation/screens/onboarding_screen.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  List<Map<String, dynamic>> _trips = [];
  bool _loading = true;
  String? _error;
  String _userRole = 'client';
  bool _driverMapped = false;
  int _onboardingStep = 2;

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;
      if (user == null) {
        setState(() {
          _loading = false;
        });
        return;
      }

      final response = await supabase
          .from('profiles')
          .select('role, onboarding_step')
          .eq('id', user.id)
          .maybeSingle();

      final role = (response?['role'] as String?) ?? 'client';
      final step = (response?['onboarding_step'] as int?) ?? 0;
      List<Map<String, dynamic>> trips = [];
      var driverMapped = false;

      if (role == 'driver') {
        final directTrips = await supabase
            .from('trips')
            .select('*, itineraries(*)')
            .eq('driver_id', user.id)
            .order('start_date', ascending: false);

        final mappedAccount = await supabase
            .from('driver_accounts')
            .select('external_driver_id')
            .eq('profile_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

        final mappedDriverId = mappedAccount?['external_driver_id'] as String?;
        driverMapped = mappedDriverId != null && mappedDriverId.isNotEmpty;

        final tripIds = <String>{};
        for (final row in List<Map<String, dynamic>>.from(directTrips)) {
          final id = row['id'] as String?;
          if (id != null) tripIds.add(id);
        }

        if (mappedDriverId != null && mappedDriverId.isNotEmpty) {
          final assignmentRows = await supabase
              .from('trip_driver_assignments')
              .select('trip_id')
              .eq('external_driver_id', mappedDriverId);

          final mappedTripIds = assignmentRows
              .map((row) => row['trip_id'] as String?)
              .whereType<String>()
              .toSet();

          if (mappedTripIds.isNotEmpty) {
            final mappedTrips = await supabase
                .from('trips')
                .select('*, itineraries(*)')
                .inFilter('id', mappedTripIds.toList())
                .order('start_date', ascending: false);

            for (final row in List<Map<String, dynamic>>.from(mappedTrips)) {
              final id = row['id'] as String?;
              if (id != null) tripIds.add(id);
            }

            trips = [
              ...List<Map<String, dynamic>>.from(directTrips),
              ...List<Map<String, dynamic>>.from(mappedTrips),
            ];
          } else {
            trips = List<Map<String, dynamic>>.from(directTrips);
          }
        } else {
          trips = List<Map<String, dynamic>>.from(directTrips);
        }

        // Deduplicate merged trips by id.
        final byId = <String, Map<String, dynamic>>{};
        for (final trip in trips) {
          final id = trip['id'] as String?;
          if (id != null) byId[id] = trip;
        }
        trips = byId.values.toList()
          ..sort((a, b) {
            final aDate = a['start_date'] as String? ?? '';
            final bDate = b['start_date'] as String? ?? '';
            return bDate.compareTo(aDate);
          });
      } else {
        final clientTrips = await supabase
            .from('trips')
            .select('*, itineraries(*)')
            .eq('client_id', user.id)
            .order('start_date', ascending: false);
        trips = List<Map<String, dynamic>>.from(clientTrips);
      }

      setState(() {
        _userRole = role;
        _driverMapped = driverMapped;
        _onboardingStep = step;
        _trips = trips;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to load trips';
        _loading = false;
      });
    }
  }

  Future<void> _signOut() async {
    await Supabase.instance.client.auth.signOut();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'My Journeys',
                            style: Theme.of(context).textTheme.headlineLarge,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${_trips.length} adventures planned',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: _signOut,
                      icon: const Icon(Icons.logout_rounded),
                      tooltip: 'Sign out',
                    ),
                  ],
                ),
              ),

              if (_userRole == 'driver' && !_driverMapped)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withAlpha(20),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Driver account is not linked by admin yet. Ask admin to map your account in Drivers page.',
                      style: TextStyle(
                        color: AppTheme.textSecondary,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              if (_userRole == 'driver') const SizedBox(height: 8),

              if (_onboardingStep < 2)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: InkWell(
                    onTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => OnboardingScreen(
                            onOnboardingComplete: () {
                                Navigator.pop(context);
                                _loadTrips(); // Refresh to update banner
                            },
                          ),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary.withAlpha(20),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.secondary.withAlpha(50)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.person_outline, color: AppTheme.secondary),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Complete your profile',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.secondary,
                                  ),
                                ),
                                Text(
                                  'Add details to get better recommendations.',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.secondary),
                        ],
                      ),
                    ),
                  ),
                ),

              // Content
              Expanded(
                child: _loading
                    ? _buildLoadingList()
                    : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 48,
                              color: Colors.grey.shade400,
                            ),
                            const SizedBox(height: 16),
                            Text(_error!),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadTrips,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _trips.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadTrips,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _trips.length,
                          itemBuilder: (context, index) {
                            final trip = _trips[index];
                            return _buildTripCard(trip)
                                .animate(delay: (100 * index).ms)
                                .fadeIn(
                                  duration: 600.ms,
                                  curve: Curves.easeOutQuad,
                                )
                                .slideY(begin: 0.2, end: 0);
                          },
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingList() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 3,
        itemBuilder: (context, index) => Container(
          margin: const EdgeInsets.only(bottom: 16),
          height: 240,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppTheme.primary.withAlpha(26),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.explore_outlined,
                size: 48,
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No trips yet',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Your adventures will appear here once planned',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTripCard(Map<String, dynamic> trip) {
    final itinerary = trip['itineraries'] as Map<String, dynamic>?;
    final rawData =
        itinerary?['raw_data'] as Map<String, dynamic>? ??
        trip['raw_data'] as Map<String, dynamic>?;
    final destination =
        itinerary?['destination'] ??
        trip['destination'] ??
        'Unknown destination';
    final duration = itinerary?['duration_days'] ?? trip['duration_days'] ?? 1;
    final summary = itinerary?['summary'] ?? rawData?['summary'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Material(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        elevation: 2,
        shadowColor: Colors.black.withAlpha(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => TripDetailScreen(trip: trip)),
            );
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image placeholder
              Hero(
                tag: 'trip-bg-${trip['id']}',
                child: Container(
                  height: 140,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(16),
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppTheme.primary.withAlpha(204),
                        AppTheme.secondary.withAlpha(204),
                      ],
                    ),
                  ),
                  child: Stack(
                    children: [
                      const Center(
                        child: Icon(
                          Icons.landscape_rounded,
                          size: 48,
                          color: Colors.white38,
                        ),
                      ),
                      Positioned(
                        top: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(230),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '$duration ${duration == 1 ? 'day' : 'days'}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Content
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on_rounded,
                          size: 18,
                          color: AppTheme.primary,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            destination,
                            style: Theme.of(context).textTheme.titleLarge,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    if (summary.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        summary,
                        style: Theme.of(context).textTheme.bodyMedium,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
