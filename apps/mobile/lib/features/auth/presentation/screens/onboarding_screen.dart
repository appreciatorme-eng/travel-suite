import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onOnboardingComplete;

  const OnboardingScreen({super.key, required this.onOnboardingComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  int _currentPage = 0;
  bool _loading = false;
  String? _role;
  
  // Form Controllers - Step 1
  final _bioController = TextEditingController();
  final _whatsappController = TextEditingController();

  // Form Controllers - Step 2 (Client)
  final _dietController = TextEditingController();
  final _mobilityController = TextEditingController();
  
  // Form Controllers - Step 2 (Driver)
  final _vehicleController = TextEditingController();
  final _licenseController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadRole();
  }

  Future<void> _loadRole() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        final response = await Supabase.instance.client
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
        if (mounted && response != null) {
          setState(() {
            _role = response['role'] as String?;
          });
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _pageController.dispose();
    _bioController.dispose();
    _whatsappController.dispose();
    _dietController.dispose();
    _mobilityController.dispose();
    _vehicleController.dispose();
    _licenseController.dispose();
    super.dispose();
  }

  Future<void> _completeOnboarding({bool skip = false}) async {
    setState(() => _loading = true);
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final updates = <String, dynamic>{
        'onboarding_step': 2, // Mark as complete
        'updated_at': DateTime.now().toIso8601String(),
      };

      if (!skip) {
        updates['bio'] = _bioController.text.trim();
        updates['phone_whatsapp'] = _whatsappController.text.trim();
        
        if (_role == 'client') {
            // Simple comma separated for now, logic can be enhanced for arrays
            if (_dietController.text.isNotEmpty) {
                 updates['dietary_requirements'] = _dietController.text.split(',').map((e) => e.trim()).toList();
            }
            updates['mobility_needs'] = _mobilityController.text.trim();
        } else if (_role == 'driver') {
             updates['driver_info'] = {
                'vehicle_details': _vehicleController.text.trim(),
                'license_number': _licenseController.text.trim(),
             };
        }
      }

      await Supabase.instance.client
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

      if (mounted) {
        widget.onOnboardingComplete();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving profile: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _nextPage() {
    if (_currentPage < 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDriver = _role == 'driver';
    
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header / Progress
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Setup Profile',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    TextButton(
                      onPressed: () => _completeOnboarding(skip: true),
                      child: const Text('Skip'),
                    ),
                  ],
                ),
              ),
              
              LinearProgressIndicator(
                  value: (_currentPage + 1) / 2,
                  backgroundColor: Colors.grey.withAlpha(50),
                  color: AppTheme.primary,
              ),

              Expanded(
                child: PageView(
                  controller: _pageController,
                  physics: const NeverScrollableScrollPhysics(),
                  onPageChanged: (page) => setState(() => _currentPage = page),
                  children: [
                    _buildStep1(),
                    _buildStep2(isDriver),
                  ],
                ),
              ),
              
              // Bottom Buttons
              Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  children: [
                    if (_currentPage > 0)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                             _pageController.previousPage(
                                duration: const Duration(milliseconds: 300),
                                curve: Curves.easeInOut,
                             );
                          },
                          child: const Text('Back'),
                        ),
                      ),
                    if (_currentPage > 0) const SizedBox(width: 16),
                    Expanded(
                        flex: 2,
                        child: ElevatedButton(
                            onPressed: _loading ? null : _nextPage,
                            child: _loading 
                                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : Text(_currentPage == 1 ? 'Finish' : 'Next'),
                        ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep1() {
    return SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                Text(
                    'Let\'s get to know you',
                    style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                    'Basic information to help us verify and serve you better.',
                    style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                
                TextField(
                    controller: _bioController,
                    decoration: const InputDecoration(
                        labelText: 'Bio / About Me',
                        alignLabelWithHint: true,
                        prefixIcon: Icon(Icons.person_outline),
                    ),
                    maxLines: 3,
                ),
                const SizedBox(height: 16),
                TextField(
                    controller: _whatsappController,
                    decoration: const InputDecoration(
                        labelText: 'WhatsApp Number',
                        prefixIcon: Icon(Icons.chat_bubble_outline),
                        hintText: '+1234567890',
                    ),
                    keyboardType: TextInputType.phone,
                ),
            ],
        ),
    );
  }

  Widget _buildStep2(bool isDriver) {
    return SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                Text(
                    isDriver ? 'Driver Details' : 'Travel Preferences',
                    style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                    isDriver 
                        ? 'Vehicle and license info for verification.' 
                        : 'Tell us how you like to travel.',
                    style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                
                if (isDriver) ...[
                    TextField(
                        controller: _vehicleController,
                        decoration: const InputDecoration(
                            labelText: 'Vehicle Details',
                            hintText: 'Toyota HiAce 2023, Plate: ABC-123',
                            prefixIcon: Icon(Icons.directions_car_outlined),
                        ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                        controller: _licenseController,
                        decoration: const InputDecoration(
                            labelText: 'License Number',
                            prefixIcon: Icon(Icons.card_membership),
                        ),
                    ),
                ] else ...[
                     TextField(
                        controller: _dietController,
                        decoration: const InputDecoration(
                            labelText: 'Dietary Requirements',
                            hintText: 'Vegetarian, Gluten-Free...',
                            prefixIcon: Icon(Icons.restaurant_menu),
                        ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                        controller: _mobilityController,
                        decoration: const InputDecoration(
                            labelText: 'Mobility Needs',
                            hintText: 'Wheelchair access, ground floor only...',
                            prefixIcon: Icon(Icons.accessible),
                        ),
                    ),
                ],
            ],
        ),
    );
  }
}
