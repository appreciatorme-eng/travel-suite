import 'package:flutter_test/flutter_test.dart';
import 'package:gobuddy_mobile/core/services/notification_payload_parser.dart';

void main() {
  group('NotificationPayloadParser.tripIdFromPayload', () {
    test('returns trip_id when present', () {
      final value = NotificationPayloadParser.tripIdFromPayload({
        'trip_id': 'abc-123',
      });

      expect(value, 'abc-123');
    });

    test('falls back to tripId when trip_id is absent', () {
      final value = NotificationPayloadParser.tripIdFromPayload({
        'tripId': 'xyz-789',
      });

      expect(value, 'xyz-789');
    });

    test('returns null for missing or blank values', () {
      expect(NotificationPayloadParser.tripIdFromPayload({}), isNull);
      expect(
        NotificationPayloadParser.tripIdFromPayload({'trip_id': '   '}),
        isNull,
      );
    });
  });
}
