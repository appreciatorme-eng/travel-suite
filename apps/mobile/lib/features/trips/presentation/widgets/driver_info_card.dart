import 'package:flutter/material.dart';
import 'package:gobuddy_mobile/core/theme/app_theme.dart';
import 'package:gobuddy_mobile/features/trips/domain/models/driver.dart';
import 'package:url_launcher/url_launcher.dart';

class DriverInfoCard extends StatelessWidget {
  final DriverAssignment assignment;

  const DriverInfoCard({super.key, required this.assignment});

  @override
  Widget build(BuildContext context) {
    final driver = assignment.driver;
    if (driver == null) return const SizedBox.shrink();

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      shadowColor: Colors.black.withAlpha(13),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundImage: driver.photoUrl != null 
                    ? NetworkImage(driver.photoUrl!) 
                    : null,
                  radius: 24,
                  backgroundColor: AppTheme.primary.withAlpha(26),
                  child: driver.photoUrl == null 
                    ? const Icon(Icons.person, color: AppTheme.primary) 
                    : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your Driver',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      Text(
                        driver.fullName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => launchUrl(Uri.parse('tel:${driver.phone}')),
                  icon: const Icon(Icons.phone, color: AppTheme.primary),
                  tooltip: 'Call Driver',
                ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildInfoItem(
                  context, 
                  Icons.directions_car, 
                  driver.vehicleType?.toUpperCase() ?? 'VEHICLE',
                  driver.vehiclePlate ?? 'On Arrival'
                ),
                _buildInfoItem(
                  context, 
                  Icons.access_time, 
                  'PICKUP',
                  assignment.pickupTime ?? 'TBD'
                ),
              ],
            ),
            if (assignment.pickupLocation != null) ...[
                const SizedBox(height: 12),
                Row(
                   children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: AppTheme.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          assignment.pickupLocation!,
                          style: Theme.of(context).textTheme.bodySmall,
                          maxLines: 1, 
                          overflow: TextOverflow.ellipsis
                        )
                      )
                   ]
                )
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(BuildContext context, IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.textSecondary),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppTheme.textSecondary)),
            const SizedBox(height: 2),
            Text(value, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
          ],
        ),
      ],
    );
  }
}
