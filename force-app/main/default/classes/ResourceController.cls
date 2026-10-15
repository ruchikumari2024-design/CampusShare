
public with sharing class ResourceController {

    @AuraEnabled(cacheable=true)
    public static List<Resource__c> getResources(
        String searchKey,
        String category
    ) {
        String searchTerm = '%' +
            (String.isBlank(searchKey) ? '' : searchKey.trim()) +
            '%';

        if (String.isBlank(category) || category == 'All') {
            return [
                SELECT Id, Name, Description__c, Category__c,
                       Listing_Type__c, Condition__c, Status__c,
                       Price_Per_Day__c, Sale_Price__c, OwnerId
                FROM Resource__c
                WHERE Status__c = 'Available'
                  AND Name LIKE :searchTerm
                WITH USER_MODE
                ORDER BY CreatedDate DESC
                LIMIT 100
            ];
        }

        return [
            SELECT Id, Name, Description__c, Category__c,
                   Listing_Type__c, Condition__c, Status__c,
                   Price_Per_Day__c, Sale_Price__c, OwnerId
            FROM Resource__c
            WHERE Status__c = 'Available'
              AND Name LIKE :searchTerm
              AND Category__c = :category
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 100
        ];
    }

    @AuraEnabled
    public static Id createResource(
        String resourceName,
        String description,
        String category,
        String listingType,
        String condition,
        Decimal pricePerDay,
        Decimal salePrice
    ) {
        if (String.isBlank(resourceName)) {
            throw new AuraHandledException(
                'Please enter a resource name.'
            );
        }

        Resource__c resource = new Resource__c(
            Name = resourceName.trim(),
            Description__c = description,
            Category__c = category,
            Listing_Type__c = listingType,
            Condition__c = condition,
            Status__c = 'Available',
            Price_Per_Day__c = pricePerDay,
            Sale_Price__c = salePrice
        );

        try {
            insert as user resource;
            return resource.Id;
        } catch (DmlException e) {
            throw new AuraHandledException(
                'Could not create listing. Check your inputs and permissions.'
            );
        }
    }
}