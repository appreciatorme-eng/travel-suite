class NotificationPayloadParser {
  const NotificationPayloadParser._();

  static String? tripIdFromPayload(Map<String, dynamic> payload) {
    final value = payload['trip_id'] ?? payload['tripId'];
    if (value is! String) return null;

    final normalized = value.trim();
    return normalized.isEmpty ? null : normalized;
  }
}
