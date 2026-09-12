from django.core.management.base import BaseCommand
from apps.services.models import ServiceCategory

CATEGORIES = [
    {
        'name': 'Passport',
        'description': 'Apply for a new passport or renew an existing one.',
        'estimated_days': 30,
        'icon': 'FaPassport',
        'required_documents': 'aadhar,photo,residence,signature',
    },
    {
        'name': 'Scholarship',
        'description': 'Apply for government scholarship schemes.',
        'estimated_days': 45,
        'icon': 'FaGraduationCap',
        'required_documents': 'income,photo,aadhar',
    },
    {
        'name': 'Water Connection',
        'description': 'Apply for a new domestic water connection.',
        'estimated_days': 21,
        'icon': 'FaTint',
        'required_documents': 'aadhar,residence',
    },
    {
        'name': 'Birth Certificate',
        'description': 'Apply for a birth certificate.',
        'estimated_days': 14,
        'icon': 'FaBaby',
        'required_documents': 'aadhar,photo',
    },
    {
        'name': 'Income Certificate',
        'description': 'Apply for an income certificate from the government.',
        'estimated_days': 10,
        'icon': 'FaFileInvoiceDollar',
        'required_documents': 'aadhar,pan,signature',
    },
    {
        'name': 'Caste Certificate',
        'description': 'Apply for a caste certificate.',
        'estimated_days': 15,
        'icon': 'FaIdCard',
        'required_documents': 'aadhar,residence,photo',
    },
    {
        'name': 'Driving License',
        'description': 'Apply for a new driving license.',
        'estimated_days': 20,
        'icon': 'FaCar',
        'required_documents': 'aadhar,photo,residence,signature',
    },
    {
        'name': 'Ration Card',
        'description': 'Apply for a new ration card.',
        'estimated_days': 25,
        'icon': 'FaShoppingBasket',
        'required_documents': 'aadhar,residence,photo,income',
    },
]


class Command(BaseCommand):
    help = 'Seed service categories with required documents'

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0
        for data in CATEGORIES:
            obj, is_new = ServiceCategory.objects.update_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'estimated_days': data['estimated_days'],
                    'icon': data['icon'],
                    'required_documents': data['required_documents'],
                    'is_active': True,
                }
            )
            if is_new:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created} created, {updated} updated.'
        ))
