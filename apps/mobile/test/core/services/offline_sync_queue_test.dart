import 'package:flutter_test/flutter_test.dart';
import 'package:gobuddy_mobile/core/services/offline_sync_queue.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeTransport implements OfflineSyncTransport {
  _FakeTransport({this.failIds = const <String>{}});

  final Set<String> failIds;
  final List<String> sentIds = <String>[];

  @override
  Future<void> send(OfflineSyncItem item) async {
    if (failIds.contains(item.id)) {
      throw Exception('Simulated network failure');
    }
    sentIds.add(item.id);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('OfflineSyncQueue', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('OfflineSyncItem serialization round trip preserves values', () {
      final item = OfflineSyncItem(
        id: 'evt-serialized',
        type: 'location_ping',
        payload: const {'tripId': 'trip-9', 'count': 1},
        createdAt: DateTime.utc(2026, 2, 11, 11, 0),
      );

      final roundTrip = OfflineSyncItem.fromJson(item.toJson());
      expect(roundTrip.id, item.id);
      expect(roundTrip.type, item.type);
      expect(roundTrip.payload, item.payload);
      expect(roundTrip.createdAt, item.createdAt);
    });

    test('enqueue persists items', () async {
      final queue = OfflineSyncQueue();
      final item = OfflineSyncItem(
        id: 'evt-1',
        type: 'location_ping',
        payload: const {'tripId': 'trip-1'},
        createdAt: DateTime.utc(2026, 2, 11, 10, 0),
      );

      await queue.enqueue(item);
      final stored = await queue.getItems();

      expect(stored.length, 1);
      expect(stored.first.id, 'evt-1');
      expect(stored.first.type, 'location_ping');
    });

    test('flush sends items and clears successful deliveries', () async {
      final queue = OfflineSyncQueue();
      final transport = _FakeTransport();

      final item1 = OfflineSyncItem(
        id: 'evt-1',
        type: 'location_ping',
        payload: const {'tripId': 'trip-1'},
        createdAt: DateTime.utc(2026, 2, 11, 10, 0),
      );
      final item2 = OfflineSyncItem(
        id: 'evt-2',
        type: 'notification_ack',
        payload: const {'notificationId': 'n-1'},
        createdAt: DateTime.utc(2026, 2, 11, 10, 5),
      );

      await queue.enqueue(item1);
      await queue.enqueue(item2);

      final sentCount = await queue.flush(transport);
      final remaining = await queue.getItems();

      expect(sentCount, 2);
      expect(transport.sentIds, ['evt-1', 'evt-2']);
      expect(remaining, isEmpty);
    });

    test('flush keeps failed items for retry', () async {
      final queue = OfflineSyncQueue();
      final transport = _FakeTransport(failIds: {'evt-2'});

      final item1 = OfflineSyncItem(
        id: 'evt-1',
        type: 'location_ping',
        payload: const {'tripId': 'trip-1'},
        createdAt: DateTime.utc(2026, 2, 11, 10, 0),
      );
      final item2 = OfflineSyncItem(
        id: 'evt-2',
        type: 'location_ping',
        payload: const {'tripId': 'trip-2'},
        createdAt: DateTime.utc(2026, 2, 11, 10, 5),
      );

      await queue.enqueue(item1);
      await queue.enqueue(item2);

      final sentCount = await queue.flush(transport);
      final remaining = await queue.getItems();

      expect(sentCount, 1);
      expect(transport.sentIds, ['evt-1']);
      expect(remaining.length, 1);
      expect(remaining.first.id, 'evt-2');
    });
  });
}
