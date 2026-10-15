
import { LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getResources from '@salesforce/apex/ResourceController.getResources';
import createResource from '@salesforce/apex/ResourceController.createResource';

import requestRental from '@salesforce/apex/RentalController.requestRental';
import getMyRequests from '@salesforce/apex/RentalController.getMyRequests';
import getRequestsForMyResources from '@salesforce/apex/RentalController.getRequestsForMyResources';
import updateRequestStatus from '@salesforce/apex/RentalController.updateRequestStatus';

export default class CampusShare extends LightningElement {
    searchKey = '';
    selectedCategory = 'All';
    resources = [];
    isLoading = false;
    errorMessage = '';
    showListingForm = false;
    isSaving = false;

    newResourceName = '';
    newDescription = '';
    newCategory = 'Books';
    newListingType = 'Rent';
    newCondition = 'Good';
    newPrice = '';
    newSalePrice = '';

    rentalModalOpen = false;
    selectedResourceId = '';
    rentalStartDate = '';
    rentalEndDate = '';
    rentalSaving = false;

    myRequests = [];
    ownerRequests = [];
    isLoadingRequests = false;

    categoryOptions = [
        { label: 'All categories', value: 'All' },
        { label: 'Books', value: 'Books' },
        { label: 'Electronics', value: 'Electronics' },
        { label: 'Sports', value: 'Sports' },
        { label: 'Stationery', value: 'Stationery' },
        { label: 'Other', value: 'Other' }
    ];

    listingCategoryOptions = [
        { label: 'Books', value: 'Books' },
        { label: 'Electronics', value: 'Electronics' },
        { label: 'Sports', value: 'Sports' },
        { label: 'Stationery', value: 'Stationery' },
        { label: 'Other', value: 'Other' }
    ];

    listingTypeOptions = [
        { label: 'Rent', value: 'Rent' },
        { label: 'Free Share', value: 'Free Share' },
        { label: 'Donate', value: 'Donate' },
        { label: 'Sell', value: 'Sell' }
    ];

    conditionOptions = [
        { label: 'New', value: 'New' },
        { label: 'Good', value: 'Good' },
        { label: 'Fair', value: 'Fair' },
        { label: 'Worn', value: 'Worn' }
    ];

    connectedCallback() {
        this.handleRefresh();
    }

    get hasResources() {
        return this.resources.length > 0;
    }

    get showEmptyState() {
        return !this.isLoading && !this.hasResources;
    }

    get isRentListing() {
        return this.newListingType === 'Rent';
    }

    get isSaleListing() {
        return this.newListingType === 'Sell';
    }

    get today() {
        return new Date().toISOString().slice(0, 10);
    }

    handleSearch(event) {
        this.searchKey = event.target.value;
    }

    handleCategoryChange(event) {
        this.selectedCategory = event.detail.value;
    }

    async handleRefresh() {
        this.isLoading = true;
        this.errorMessage = '';

        try {
            const data = await getResources({
                searchKey: this.searchKey,
                category: this.selectedCategory
            });

            this.resources = (data || []).map(resource => ({
                ...resource,
                resourceIsAvailable:
                    resource.Status__c === 'Available',
                isRentType:
                    resource.Listing_Type__c === 'Rent',
                isSellType:
                    resource.Listing_Type__c === 'Sell',
                canRequestRental:
                    resource.Status__c === 'Available' &&
                    resource.Listing_Type__c === 'Rent'
            }));
        } catch (error) {
            this.errorMessage =
                error.body?.message || 'Unable to load resources.';
            this.showToast(
                'Loading failed',
                this.errorMessage,
                'error'
            );
        } finally {
            this.isLoading = false;
        }
    }

    openListingForm() {
        this.showListingForm = true;
    }

    closeListingForm() {
        this.showListingForm = false;
    }

    handleNameChange(event) {
        this.newResourceName = event.target.value;
    }

    handleDescriptionChange(event) {
        this.newDescription = event.target.value;
    }

    handleNewCategoryChange(event) {
        this.newCategory = event.detail.value;
    }

    handleNewListingTypeChange(event) {
        this.newListingType = event.detail.value;
    }

    handleConditionChange(event) {
        this.newCondition = event.detail.value;
    }

    handlePriceChange(event) {
        this.newPrice = event.target.value;
    }

    handleSalePriceChange(event) {
        this.newSalePrice = event.target.value;
    }

    async handleSaveListing() {
        if (!this.newResourceName.trim()) {
            this.showToast(
                'Missing name',
                'Enter a name for your resource.',
                'error'
            );
            return;
        }

        if (this.isRentListing &&
            (this.newPrice === '' ||
             Number(this.newPrice) < 0)) {
            this.showToast(
                'Invalid rental price',
                'Enter a valid price per day.',
                'error'
            );
            return;
        }

        if (this.isSaleListing &&
            (this.newSalePrice === '' ||
             Number(this.newSalePrice) < 0)) {
            this.showToast(
                'Invalid sale price',
                'Enter a valid sale price.',
                'error'
            );
            return;
        }

        this.isSaving = true;

        try {
            await createResource({
                resourceName: this.newResourceName.trim(),
                description: this.newDescription,
                category: this.newCategory,
                listingType: this.newListingType,
                condition: this.newCondition,
                pricePerDay: this.isRentListing
                    ? Number(this.newPrice) : null,
                salePrice: this.isSaleListing
                    ? Number(this.newSalePrice) : null
            });

            this.showToast(
                'Listing created',
                'Your resource has been added.',
                'success'
            );

            this.showListingForm = false;
            this.resetListingForm();
            await this.handleRefresh();
        } catch (error) {
            this.showToast(
                'Save failed',
                error.body?.message ||
                    'Unable to create the listing.',
                'error'
            );
        } finally {
            this.isSaving = false;
        }
    }

    resetListingForm() {
        this.newResourceName = '';
        this.newDescription = '';
        this.newCategory = 'Books';
        this.newListingType = 'Rent';
        this.newCondition = 'Good';
        this.newPrice = '';
        this.newSalePrice = '';
    }

    openRentalModal(event) {
        this.selectedResourceId = event.currentTarget.dataset.id;
        this.rentalStartDate = '';
        this.rentalEndDate = '';
        this.rentalModalOpen = true;
    }

    closeRentalModal() {
        this.rentalModalOpen = false;
    }

    handleRentalStartChange(event) {
        this.rentalStartDate = event.detail.value;
    }

    handleRentalEndChange(event) {
        this.rentalEndDate = event.detail.value;
    }

    async submitRentalRequest() {
        if (!this.selectedResourceId ||
            !this.rentalStartDate ||
            !this.rentalEndDate) {
            this.showToast(
                'Missing information',
                'Select both rental dates.',
                'error'
            );
            return;
        }

        if (this.rentalStartDate < this.today) {
            this.showToast(
                'Invalid date',
                'Start date cannot be in the past.',
                'error'
            );
            return;
        }

        if (this.rentalEndDate < this.rentalStartDate) {
            this.showToast(
                'Invalid dates',
                'End date must be on or after the start date.',
                'error'
            );
            return;
        }

        this.rentalSaving = true;

        try {
            await requestRental({
                resourceId: this.selectedResourceId,
                startDate: this.rentalStartDate,
                endDate: this.rentalEndDate
            });

            this.showToast(
                'Request submitted',
                'Your request is pending approval.',
                'success'
            );

            this.rentalModalOpen = false;
            await this.loadRentalRequests();
        } catch (error) {
            this.showToast(
                'Request failed',
                error.body?.message ||
                    'Unable to submit the request.',
                'error'
            );
        } finally {
            this.rentalSaving = false;
        }
    }

    async loadRentalRequests() {
        this.isLoadingRequests = true;

        try {
            const [mine, owned] = await Promise.all([
                getMyRequests(),
                getRequestsForMyResources()
            ]);

            this.myRequests = mine || [];

            this.ownerRequests = (owned || []).map(request => ({
                ...request,
                isPending: request.Status__c === 'Pending',
                canReturn: [
                    'Approved',
                    'Active'
                ].includes(request.Status__c)
            }));
        } catch (error) {
            this.showToast(
                'Loading failed',
                error.body?.message ||
                    'Unable to load rental requests.',
                'error'
            );
        } finally {
            this.isLoadingRequests = false;
        }
    }

    async handleRequestStatus(event) {
        const requestId = event.currentTarget.dataset.id;
        const newStatus = event.currentTarget.dataset.status;

        try {
            await updateRequestStatus({
                requestId: requestId,
                newStatus: newStatus
            });

            this.showToast(
                'Status updated',
                `Request marked ${newStatus}.`,
                'success'
            );

            await this.loadRentalRequests();
        } catch (error) {
            this.showToast(
                'Update failed',
                error.body?.message ||
                    'Unable to update the request.',
                'error'
            );
        }
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}
