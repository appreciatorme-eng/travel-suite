import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class OfflineSyncItem {
  const OfflineSyncItem({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
  });

  final String id;
  final String type;
  final Map<String, dynamic> payload;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'payload': payload,
    'created_at': createdAt.toIso8601String(),
  };

  static OfflineSyncItem fromJson(Map<String, dynamic> json) {
    return OfflineSyncItem(
      id: json['id'] as String,
      type: json['type'] as String,
      payload: Map<String, dynamic>.from(json['payload'] as Map),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

abstract class OfflineSyncTransport {
  Future<void> send(OfflineSyncItem item);
}

class OfflineSyncQueue {
  OfflineSyncQueue({SharedPreferences? preferences})
    : _preferencesFuture = preferences != null
          ? Future<SharedPreferences>.value(preferences)
          : SharedPreferences.getInstance();

  static const _queueKey = 'offline_sync_queue_v1';
  final Future<SharedPreferences> _preferencesFuture;

  Future<List<OfflineSyncItem>> getItems() async {
    final prefs = await _preferencesFuture;
    final raw = prefs.getString(_queueKey);
    if (raw == null || raw.isEmpty) return [];

    final decoded = jsonDecode(raw) as List<dynamic>;
    return decoded
        .map((e) => OfflineSyncItem.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> enqueue(OfflineSyncItem item) async {
    final items = await getItems();
    items.add(item);
    await _save(items);
  }

  Future<void> clear() async {
    final prefs = await _preferencesFuture;
    await prefs.remove(_queueKey);
  }

  Future<int> flush(OfflineSyncTransport transport) async {
    final items = await getItems();
    if (items.isEmpty) return 0;

    final remaining = <OfflineSyncItem>[];
    var sentCount = 0;

    for (final item in items) {
      try {
        await transport.send(item);
        sentCount++;
      } catch (_) {
        remaining.add(item);
      }
    }

    await _save(remaining);
    return sentCount;
  }

  Future<void> _save(List<OfflineSyncItem> items) async {
    final prefs = await _preferencesFuture;
    if (items.isEmpty) {
      await prefs.remove(_queueKey);
      return;
    }

    final encoded = jsonEncode(items.map((e) => e.toJson()).toList());
    await prefs.setString(_queueKey, encoded);
  }
}
